import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listLeads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("leads")
      .select("*")
      .order("last_comment_at", { ascending: false, nullsFirst: false });
    if (error) throw new Error(error.message);
    return data;
  });

const UpdateLeadInput = z.object({
  id: z.string().uuid(),
  status: z.enum(["not_contacted", "contacted"]).optional(),
  note: z.string().max(2000).nullable().optional(),
});

export const updateLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UpdateLeadInput.parse(input))
  .handler(async ({ context, data }) => {
    const patch: Record<string, unknown> = {};
    if (data.status !== undefined) patch.status = data.status;
    if (data.note !== undefined) patch.note = data.note;
    const { data: out, error } = await context.supabase
      .from("leads")
      .update(patch)
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return out;
  });

export const syncLeadsFromLinkedIn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getPostComments, getPersonProfile } = await import("./linkedin.server");

    // 1. Pull the user's posts that made it to LinkedIn.
    const { data: posts, error: postsErr } = await context.supabase
      .from("posts")
      .select("id, linkedin_urn")
      .eq("status", "posted")
      .not("linkedin_urn", "is", null);
    if (postsErr) throw new Error(postsErr.message);
    if (!posts || posts.length === 0) {
      return { syncedPosts: 0, newLeads: 0, newComments: 0, error: null as string | null };
    }

    // 2. Existing comment URNs so we skip duplicates.
    const { data: existing } = await context.supabase
      .from("lead_comments")
      .select("comment_urn")
      .eq("user_id", context.userId);
    const seen = new Set((existing ?? []).map((c) => c.comment_urn));

    let newLeads = 0;
    let newComments = 0;
    let firstError: string | null = null;

    for (const post of posts) {
      const urn = post.linkedin_urn as string;
      let comments: Awaited<ReturnType<typeof getPostComments>> = [];
      try {
        comments = await getPostComments(urn);
      } catch (e) {
        if (!firstError) firstError = e instanceof Error ? e.message : String(e);
        continue;
      }

      for (const c of comments) {
        const actor = c.actor;
        const commentUrn = c.$URN ?? c.id;
        if (!actor || !commentUrn) continue;
        if (seen.has(commentUrn)) continue;

        const commentedAtIso = c.created?.time
          ? new Date(c.created.time).toISOString()
          : new Date().toISOString();
        const commentText = c.message?.text ?? "";

        // Upsert the lead row.
        const { data: leadRow } = await context.supabase
          .from("leads")
          .select("id, comment_count, name, headline")
          .eq("user_id", context.userId)
          .eq("person_urn", actor)
          .maybeSingle();

        let leadId = leadRow?.id;
        let profile: Awaited<ReturnType<typeof getPersonProfile>> = null;
        if (!leadRow || !leadRow.name) {
          profile = await getPersonProfile(actor).catch(() => null);
        }

        if (leadRow) {
          await context.supabase
            .from("leads")
            .update({
              comment_count: (leadRow.comment_count ?? 0) + 1,
              last_comment_at: commentedAtIso,
              last_comment_text: commentText,
              ...(profile?.name && !leadRow.name ? { name: profile.name } : {}),
              ...(profile?.headline && !leadRow.headline ? { headline: profile.headline } : {}),
              ...(profile?.profileUrl ? { profile_url: profile.profileUrl } : {}),
            })
            .eq("id", leadRow.id);
        } else {
          const { data: inserted, error: insErr } = await context.supabase
            .from("leads")
            .insert({
              user_id: context.userId,
              person_urn: actor,
              name: profile?.name ?? null,
              headline: profile?.headline ?? null,
              profile_url: profile?.profileUrl ?? null,
              comment_count: 1,
              last_comment_at: commentedAtIso,
              last_comment_text: commentText,
              status: "not_contacted",
            })
            .select("id")
            .single();
          if (insErr) {
            if (!firstError) firstError = insErr.message;
            continue;
          }
          leadId = inserted.id;
          newLeads += 1;
        }

        if (!leadId) continue;
        const { error: cErr } = await context.supabase.from("lead_comments").insert({
          user_id: context.userId,
          lead_id: leadId,
          post_id: post.id,
          post_urn: urn,
          comment_urn: commentUrn,
          comment_text: commentText,
          commented_at: commentedAtIso,
        });
        if (!cErr) {
          seen.add(commentUrn);
          newComments += 1;
        }
      }
    }

    return { syncedPosts: posts.length, newLeads, newComments, error: firstError };
  });