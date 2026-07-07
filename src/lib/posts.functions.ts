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

export const getPost = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { data: out, error } = await context.supabase
      .from("posts")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    return out;
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
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        imageDataUrl: z.string().startsWith("data:image/").optional(),
      })
      .parse(input),
  )
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

    const { getUserInfo, publishTextPost, publishImagePost } = await import("@/lib/linkedin.server");
    let personSub = profile?.linkedin_urn ?? "";
    if (!personSub) {
      const info = await getUserInfo();
      personSub = info.sub;
      await context.supabase.from("profiles").update({ linkedin_urn: personSub }).eq("id", context.userId);
    }
    try {
      let urn: string | null;
      if (data.imageDataUrl) {
        const match = data.imageDataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
        if (!match) throw new Error("Invalid image data URL");
        const contentType = match[1];
        const bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
        urn = await publishImagePost(personSub, post.content, bytes, contentType);
      } else {
        urn = await publishTextPost(personSub, post.content);
      }
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

export const generateHashtags = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ content: z.string().min(1).max(10000) }).parse(input),
  )
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "You generate 4-6 highly relevant LinkedIn hashtags for a post. Return ONLY the hashtags separated by single spaces, each starting with #, camelCase or lowercase, no punctuation, no explanations.",
          },
          { role: "user", content: data.content },
        ],
        temperature: 0.5,
      }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`Hashtag generation failed: ${res.status} ${t}`);
    }
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = json.choices?.[0]?.message?.content ?? "";
    const tags = Array.from(raw.matchAll(/#[A-Za-z0-9_]+/g)).map((m) => m[0]);
    return { hashtags: tags.slice(0, 6) };
  });