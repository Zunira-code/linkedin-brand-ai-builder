import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/cron/publish-due")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Only the private CRON_SECRET can trigger this job. The Supabase
        // publishable/anon key ships in the client bundle and would let
        // anyone force-publish scheduled posts.
        const expectedSecret = process.env.CRON_SECRET;
        if (!expectedSecret) {
          return new Response("Server misconfigured", { status: 500 });
        }
        const cronSecret = request.headers.get("x-cron-secret");
        if (cronSecret !== expectedSecret) {
          return new Response("Unauthorized", { status: 401 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { publishTextPost, publishImagePost, publishVideoPost, commentOnPost } = await import("@/lib/linkedin.server");
        const { getLinkedInAuthForUser } = await import("@/lib/linkedin-auth.server");

        const nowIso = new Date().toISOString();
        const { data: due, error } = await supabaseAdmin
          .from("posts")
          .select("id, user_id, content, image_data_url, video_url, first_comment")
          .eq("status", "scheduled")
          .lte("scheduled_at", nowIso)
          .limit(20);
        if (error) return new Response(error.message, { status: 500 });

        const results: Array<{ id: string; ok: boolean; error?: string }> = [];
        for (const p of due ?? []) {
          try {
            const auth = await getLinkedInAuthForUser(p.user_id);
            if (!auth) throw new Error("LinkedIn not connected");
            let urn: string | null;
            const img = (p as { image_data_url?: string | null }).image_data_url;
            const vid = (p as { video_url?: string | null }).video_url;
            if (vid) {
              const { data: blob, error: dlErr } = await supabaseAdmin.storage
                .from("post-videos")
                .download(vid);
              if (dlErr || !blob) throw new Error(`Could not read video: ${dlErr?.message ?? "no blob"}`);
              const buf = new Uint8Array(await blob.arrayBuffer());
              urn = await publishVideoPost(auth.accessToken, auth.urn, p.content, buf, blob.type || "video/mp4");
            } else if (img) {
              const match = img.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
              if (!match) throw new Error("Invalid stored image data URL");
              const bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
              urn = await publishImagePost(auth.accessToken, auth.urn, p.content, bytes, match[1]);
            } else {
              urn = await publishTextPost(auth.accessToken, auth.urn, p.content);
            }
            const fc = (p as { first_comment?: string | null }).first_comment;
            const commentDueAt =
              fc && urn
                ? new Date(Date.now() + (60 + Math.floor(Math.random() * 61)) * 1000).toISOString()
                : null;
            await supabaseAdmin
              .from("posts")
              .update({
                status: "posted",
                posted_at: new Date().toISOString(),
                linkedin_urn: urn,
                first_comment_scheduled_at: commentDueAt,
              })
              .eq("id", p.id);
            results.push({ id: p.id, ok: true });
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            await supabaseAdmin.from("posts").update({ status: "failed", error: msg }).eq("id", p.id);
            results.push({ id: p.id, ok: false, error: msg });
          }
        }

        // Drain due first comments — posts already published to LinkedIn whose
        // first_comment_scheduled_at has arrived and haven't been commented on yet.
        const { data: dueComments } = await supabaseAdmin
          .from("posts")
          .select("id, user_id, first_comment, linkedin_urn")
          .eq("status", "posted")
          .not("first_comment", "is", null)
          .not("linkedin_urn", "is", null)
          .is("first_comment_posted_at", null)
          .lte("first_comment_scheduled_at", new Date().toISOString())
          .limit(20);

        const commentResults: Array<{ id: string; ok: boolean; error?: string }> = [];
        for (const p of dueComments ?? []) {
          try {
            const auth = await getLinkedInAuthForUser(p.user_id);
            if (!auth) throw new Error("LinkedIn not connected");
            const commentUrn = await commentOnPost(
              auth.accessToken,
              auth.urn,
              p.linkedin_urn as string,
              (p.first_comment as string).trim(),
            );
            await supabaseAdmin
              .from("posts")
              .update({
                first_comment_posted_at: new Date().toISOString(),
                first_comment_urn: commentUrn,
                first_comment_error: null,
              })
              .eq("id", p.id);
            commentResults.push({ id: p.id, ok: true });
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            await supabaseAdmin
              .from("posts")
              .update({ first_comment_error: msg })
              .eq("id", p.id);
            commentResults.push({ id: p.id, ok: false, error: msg });
          }
        }

        return Response.json({
          processed: results.length,
          results,
          comments: commentResults.length,
          commentResults,
        });
      },
    },
  },
});