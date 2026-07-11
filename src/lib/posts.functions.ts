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
  image_data_url: z.string().startsWith("data:image/").nullable().optional(),
  video_url: z.string().nullable().optional(),
  first_comment: z.string().max(1250).nullable().optional(),
});

export const savePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SavePostInput.parse(input))
  .handler(async ({ context, data }) => {
    const row: {
      user_id: string;
      content: string;
      format: string;
      status: "draft" | "scheduled";
      scheduled_at: string | null;
      image_data_url?: string | null;
      video_url?: string | null;
      first_comment?: string | null;
    } = {
      user_id: context.userId,
      content: data.content,
      format: data.format,
      status: data.status,
      scheduled_at: data.status === "scheduled" ? data.scheduled_at ?? null : null,
    };
    if (data.image_data_url !== undefined) {
      row.image_data_url = data.image_data_url;
    }
    if (data.video_url !== undefined) {
      row.video_url = data.video_url;
    }
    if (data.first_comment !== undefined) {
      const trimmed = (data.first_comment ?? "").trim();
      row.first_comment = trimmed.length > 0 ? trimmed : null;
    }
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
      .select("id, content, user_id, image_data_url, video_url, first_comment")
      .eq("id", data.id)
      .single();
    if (error || !post) throw new Error("Post not found");

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("linkedin_urn")
      .eq("id", context.userId)
      .single();

    const { getUserInfo, publishTextPost, publishImagePost, publishVideoPost } = await import("@/lib/linkedin.server");
    let personSub = profile?.linkedin_urn ?? "";
    if (!personSub) {
      const info = await getUserInfo();
      personSub = info.sub;
      await context.supabase.from("profiles").update({ linkedin_urn: personSub }).eq("id", context.userId);
    }
    try {
      let urn: string | null;
      const imageDataUrl = data.imageDataUrl ?? (post as { image_data_url?: string | null }).image_data_url ?? undefined;
      const videoUrl = (post as { video_url?: string | null }).video_url ?? undefined;
      if (videoUrl) {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: blob, error: dlErr } = await supabaseAdmin.storage
          .from("post-videos")
          .download(videoUrl);
        if (dlErr || !blob) throw new Error(`Could not read video: ${dlErr?.message ?? "no blob"}`);
        const buf = new Uint8Array(await blob.arrayBuffer());
        urn = await publishVideoPost(personSub, post.content, buf, blob.type || "video/mp4");
      } else if (imageDataUrl) {
        const match = imageDataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
        if (!match) throw new Error("Invalid image data URL");
        const contentType = match[1];
        const bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
        urn = await publishImagePost(personSub, post.content, bytes, contentType);
      } else {
        urn = await publishTextPost(personSub, post.content);
      }
      await context.supabase
        .from("posts")
        .update({
          status: "posted",
          posted_at: new Date().toISOString(),
          linkedin_urn: urn,
          error: null,
          // Queue the first comment for 60–120s from now so it looks organic.
          first_comment_scheduled_at:
            (post as { first_comment?: string | null }).first_comment && urn
              ? new Date(Date.now() + (60 + Math.floor(Math.random() * 61)) * 1000).toISOString()
              : null,
        })
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
      headers: {
        Authorization: `Bearer ${key}`,
        "Lovable-API-Key": key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "You generate 4-6 highly relevant, high-reach LinkedIn hashtags for a post. Mix 1-2 broad viral tags (e.g. #Leadership, #Startups) with specific niche tags. Return ONLY the hashtags separated by single spaces, each starting with #, camelCase or lowercase, no punctuation, no explanations.",
          },
          { role: "user", content: data.content },
        ],
        temperature: 0.5,
      }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`Hashtag generation failed (${res.status}): ${t.slice(0, 200)}`);
    }
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = json.choices?.[0]?.message?.content ?? "";
    const tags = Array.from(raw.matchAll(/#[A-Za-z0-9_]+/g)).map((m) => m[0]);
    return { hashtags: tags.slice(0, 6) };
  });

export const suggestFirstComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ content: z.string().min(1).max(10000) }).parse(input),
  )
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Lovable-API-Key": key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "You write the AUTHOR's own first comment on their LinkedIn post — the reply they leave under their own post 1-2 min after publishing. Goals: 1) add ONE concrete extra insight, resource, or CTA the post itself doesn't already say, 2) invite discussion with a specific, easy-to-answer question, 3) sound like the author, not a marketer. Rules: 60-220 characters, plain text, no hashtags, no emojis except at most one, no quotation marks, no 'Great post!' style. Return ONLY the comment text.",
          },
          { role: "user", content: data.content },
        ],
        temperature: 0.8,
      }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`Comment suggestion failed (${res.status}): ${t.slice(0, 200)}`);
    }
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = (json.choices?.[0]?.message?.content ?? "").trim();
    // Strip wrapping quotes if the model added them.
    const cleaned = raw.replace(/^["'`]+|["'`]+$/g, "").trim();
    return { comment: cleaned };
  });

function stripHtml(html: string): string {
  // Remove script/style blocks, then all tags, then collapse whitespace.
  const noScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
  const noTags = noScripts.replace(/<[^>]+>/g, " ");
  const decoded = noTags
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  return decoded.replace(/\s+/g, " ").trim();
}

const RepurposeInput = z
  .object({
    url: z.string().url().optional(),
    text: z.string().max(50000).optional(),
    tone: z.string().max(40).optional(),
  })
  .refine((v) => Boolean(v.url) || Boolean(v.text && v.text.trim().length >= 50), {
    message: "Provide a URL or at least 50 characters of text.",
  });

export const repurposeContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RepurposeInput.parse(input))
  .handler(async ({ context, data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    let source = (data.text ?? "").trim();
    let sourceTitle = "";
    if (data.url) {
      try {
        const res = await fetch(data.url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (compatible; PostpilotBot/1.0; +https://postpilot.app)",
            Accept: "text/html,application/xhtml+xml",
          },
          redirect: "follow",
        });
        if (!res.ok) throw new Error(`Fetch failed (${res.status})`);
        const html = await res.text();
        const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        if (titleMatch) sourceTitle = stripHtml(titleMatch[1]).slice(0, 200);
        const extracted = stripHtml(html);
        source = extracted;
      } catch (e) {
        throw new Error(
          `Couldn't fetch that URL (${e instanceof Error ? e.message : String(e)}). Paste the text instead.`,
        );
      }
    }
    if (!source || source.length < 50) {
      throw new Error("Not enough content to repurpose.");
    }
    // Cap to keep the prompt tight.
    const trimmed = source.slice(0, 12000);

    // Load voice samples so drafts sound like the user.
    const { data: samples } = await context.supabase
      .from("voice_samples")
      .select("content")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(12);
    const voiceBlock =
      samples && samples.length > 0
        ? `\n\nBelow are ${samples.length} real posts this user has written on LinkedIn. Mirror their vocabulary, sentence length, cadence and opinions in every draft.\n\n${samples
            .map((s, i) => `--- Sample ${i + 1} ---\n${s.content}`)
            .join("\n\n")}`
        : "";

    const toneLine = data.tone ? `\nOverall tone: ${data.tone}.` : "";
    const system = `You are Postpilot, an expert LinkedIn ghostwriter. You take a long-form source (article, transcript, newsletter) and turn it into 4 DISTINCT LinkedIn post drafts.

Each draft must:
- take a genuinely different angle or hook from the others (e.g. contrarian take, personal story, tactical listicle, question/poll, framework, bold prediction)
- open with a scroll-stopping first line, no greetings, no "In today's world"
- use short lines and generous whitespace (single-sentence paragraphs)
- stay under 1300 characters
- end with a question, takeaway, or call-to-comment
- NOT include hashtags or emojis unless the source clearly warrants it

Return STRICT JSON matching this shape and nothing else:
{"drafts":[{"angle":"short label of the angle","hook":"first line of the post","content":"full post text with line breaks as \\n"}]}

Return exactly 4 drafts.${toneLine}${voiceBlock}`;

    const userMsg = `Source${sourceTitle ? ` — "${sourceTitle}"` : ""}${
      data.url ? ` (${data.url})` : ""
    }:\n\n${trimmed}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Lovable-API-Key": key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          { role: "user", content: userMsg },
        ],
        temperature: 0.85,
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      if (res.status === 429) throw new Error("Rate limited — try again in a minute.");
      if (res.status === 402) throw new Error("AI credits exhausted. Add credits in workspace billing.");
      throw new Error(`Repurpose failed (${res.status}): ${t.slice(0, 200)}`);
    }
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = json.choices?.[0]?.message?.content ?? "";
    let parsed: { drafts?: Array<{ angle?: string; hook?: string; content?: string }> } = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          parsed = JSON.parse(match[0]);
        } catch {
          /* ignore */
        }
      }
    }
    const drafts = (parsed.drafts ?? [])
      .map((d) => ({
        angle: (d.angle ?? "").toString().slice(0, 80) || "Draft",
        hook: (d.hook ?? "").toString().slice(0, 200),
        content: (d.content ?? "").toString().trim(),
      }))
      .filter((d) => d.content.length > 0)
      .slice(0, 5);
    if (drafts.length === 0) {
      throw new Error("AI didn't return usable drafts — try again.");
    }
    return { drafts, sourceTitle: sourceTitle || null };
  });