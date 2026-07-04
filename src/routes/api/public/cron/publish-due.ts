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
        const { publishTextPost } = await import("@/lib/linkedin.server");

        const nowIso = new Date().toISOString();
        const { data: due, error } = await supabaseAdmin
          .from("posts")
          .select("id, user_id, content")
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
            const urn = await publishTextPost(prof.linkedin_urn, p.content);
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