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

const AddLeadInput = z.object({
  name: z.string().trim().min(1).max(200),
  headline: z.string().trim().max(300).optional().nullable(),
  profile_url: z.string().trim().url().max(500).optional().nullable(),
  last_comment_text: z.string().trim().max(2000).optional().nullable(),
  note: z.string().trim().max(2000).optional().nullable(),
});

export const addLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AddLeadInput.parse(input))
  .handler(async ({ context, data }) => {
    const personUrn = `manual:${crypto.randomUUID()}`;
    const { data: out, error } = await context.supabase
      .from("leads")
      .insert({
        user_id: context.userId,
        person_urn: personUrn,
        name: data.name,
        headline: data.headline ?? null,
        profile_url: data.profile_url ?? null,
        last_comment_text: data.last_comment_text ?? null,
        last_comment_at: data.last_comment_text ? new Date().toISOString() : null,
        comment_count: data.last_comment_text ? 1 : 0,
        note: data.note ?? null,
        status: "not_contacted",
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return out;
  });

export const updateLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UpdateLeadInput.parse(input))
  .handler(async ({ context, data }) => {
    const patch: { status?: "not_contacted" | "contacted"; note?: string | null } = {};
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
    const { getLinkedInAuthForUser } = await import("./linkedin-auth.server");
    const auth = await getLinkedInAuthForUser(context.userId);
    if (!auth) {
      return { syncedPosts: 0, newLeads: 0, newComments: 0, error: "Connect LinkedIn first" };
    }

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
        comments = await getPostComments(auth.accessToken, urn);
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
          profile = await getPersonProfile(auth.accessToken, actor).catch(() => null);
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