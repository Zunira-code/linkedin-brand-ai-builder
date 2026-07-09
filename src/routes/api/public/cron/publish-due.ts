import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/cron/publish-due")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = request.headers.get("x-cron-secret");
        if (!secret || secret !== process.env.CRON_SECRET) {
          return new Response("Unauthorized", { status: 401 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { publishTextPost, publishImagePost } = await import("@/lib/linkedin.server");

        const nowIso = new Date().toISOString();
        const { data: due, error } = await supabaseAdmin
          .from("posts")
          .select("id, user_id, content, image_data_url")
          .eq("status", "scheduled")
          .lte("scheduled_at", nowIso)
          .limit(20);
        if (error) return new Response(error.message, { status: 500 });

        const results: Array<{ id: string; ok: boolean; error?: string }> = [];
        for (const p of due ?? []) {
          try {
            const { data: prof } = await supabaseAdmin
              .from("profiles")
              .select("linkedin_urn")
              .eq("id", p.user_id)
              .maybeSingle();
            if (!prof?.linkedin_urn) throw new Error("LinkedIn not connected");
            let urn: string | null;
            const img = (p as { image_data_url?: string | null }).image_data_url;
            if (img) {
              const match = img.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
              if (!match) throw new Error("Invalid stored image data URL");
              const bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
              urn = await publishImagePost(prof.linkedin_urn, p.content, bytes, match[1]);
            } else {
              urn = await publishTextPost(prof.linkedin_urn, p.content);
            }
            await supabaseAdmin
              .from("posts")
              .update({ status: "posted", posted_at: new Date().toISOString(), linkedin_urn: urn })
              .eq("id", p.id);
            results.push({ id: p.id, ok: true });
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            await supabaseAdmin.from("posts").update({ status: "failed", error: msg }).eq("id", p.id);
            results.push({ id: p.id, ok: false, error: msg });
          }
        }
        return Response.json({ processed: results.length, results });
      },
    },
  },
});