import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/linkedin/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const errorParam = url.searchParams.get("error");
        const errorDesc = url.searchParams.get("error_description");

        const html = (payload: Record<string, unknown>) => `<!doctype html><html><head><meta charset="utf-8"><title>LinkedIn</title></head><body style="font-family:system-ui;padding:24px;text-align:center">
<p id="msg">Finishing sign-in…</p>
<script>
  (function(){
    var data = ${JSON.stringify({ type: "linkedin-oauth", ...payload })};
    try { if (window.opener) window.opener.postMessage(data, "*"); } catch(e) {}
    document.getElementById("msg").textContent = data.success ? "Connected! You can close this window." : ("Failed: " + (data.error || "unknown"));
    setTimeout(function(){ window.close(); }, 1200);
  })();
</script></body></html>`;

        const respond = (payload: Record<string, unknown>) =>
          new Response(html(payload), {
            status: 200,
            headers: { "Content-Type": "text/html; charset=utf-8" },
          });

        if (errorParam) return respond({ success: false, error: errorDesc || errorParam });
        if (!code || !state) return respond({ success: false, error: "Missing code/state" });

        const { verifyState, exchangeCodeForToken } = await import("@/lib/linkedin-auth.server");
        const parsed = verifyState(state);
        if (!parsed) return respond({ success: false, error: "Invalid state" });

        const redirectUri = `${parsed.origin}/api/public/linkedin/callback`;
        try {
          const token = await exchangeCodeForToken(code, redirectUri);

          // Fetch userinfo with the freshly issued token so we can record the
          // LinkedIn person URN and profile fields.
          const uiRes = await fetch("https://api.linkedin.com/v2/userinfo", {
            headers: { Authorization: `Bearer ${token.access_token}` },
          });
          const uiText = await uiRes.text();
          if (!uiRes.ok) throw new Error(`userinfo ${uiRes.status}: ${uiText}`);
          const info = JSON.parse(uiText) as {
            sub: string;
            name?: string;
            picture?: string;
            email?: string;
          };

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const nowIso = new Date().toISOString();
          const expiresAt = new Date(Date.now() + token.expires_in * 1000).toISOString();

          const { error: connErr } = await supabaseAdmin
            .from("linkedin_connections")
            .upsert(
              {
                user_id: parsed.userId,
                linkedin_profile_id: info.sub,
                access_token: token.access_token,
                refresh_token: token.refresh_token ?? null,
                token_expires_at: expiresAt,
                scope: token.scope ?? null,
                updated_at: nowIso,
              },
              { onConflict: "user_id" },
            );
          if (connErr) throw new Error(connErr.message);

          const profilePatch: Record<string, string> = { linkedin_urn: info.sub };
          if (info.name) profilePatch.display_name = info.name;
          if (info.picture) profilePatch.avatar_url = info.picture;
          await supabaseAdmin.from("profiles").update(profilePatch).eq("id", parsed.userId);

          return respond({ success: true, name: info.name ?? null });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          return respond({ success: false, error: msg });
        }
      },
    },
  },
});