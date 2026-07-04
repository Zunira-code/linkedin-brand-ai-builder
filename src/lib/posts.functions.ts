import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listPosts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  });

const SavePostInput = z.object({
  id: z.string().uuid().optional(),
  content: z.string().min(1).max(10000),
  format: z.string().default("story"),
  status: z.enum(["draft", "scheduled"]).default("draft"),
  scheduled_at: z.string().datetime().nullable().optional(),
});

export const savePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SavePostInput.parse(input))
  .handler(async ({ context, data }) => {
    const row = {
      user_id: context.userId,
      content: data.content,
      format: data.format,
      status: data.status,
      scheduled_at: data.status === "scheduled" ? data.scheduled_at ?? null : null,
    };
    if (data.id) {
      const { data: out, error } = await context.supabase
        .from("posts")
        .update(row)
        .eq("id", data.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return out;
    }
    const { data: out, error } = await context.supabase
      .from("posts")
      .insert(row)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return out;
  });

export const deletePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("posts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const publishPostNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { data: post, error } = await context.supabase
      .from("posts")
      .select("id, content, user_id")
      .eq("id", data.id)
      .single();
    if (error || !post) throw new Error("Post not found");

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("linkedin_urn")
      .eq("id", context.userId)
      .single();

    const { getUserInfo, publishTextPost } = await import("@/lib/linkedin.server");
    let personSub = profile?.linkedin_urn ?? "";
    if (!personSub) {
      const info = await getUserInfo();
      personSub = info.sub;
      await context.supabase.from("profiles").update({ linkedin_urn: personSub }).eq("id", context.userId);
    }
    try {
      const urn = await publishTextPost(personSub, post.content);
      await context.supabase
        .from("posts")
        .update({ status: "posted", posted_at: new Date().toISOString(), linkedin_urn: urn, error: null })
        .eq("id", post.id);
      return { ok: true, urn };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await context.supabase.from("posts").update({ status: "failed", error: msg }).eq("id", post.id);
      throw new Error(msg);
    }
  });