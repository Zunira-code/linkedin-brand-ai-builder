import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireTier } from "@/lib/tier.server";

export type Slide = { title: string; body: string };

/** LinkedIn portrait document post — 4:5. */
export const CAROUSEL_WIDTH = 1080;
export const CAROUSEL_HEIGHT = 1350;
/** Enforced character limits so slides stay readable. */
export const SLIDE_TITLE_MAX = 60;
export const SLIDE_BODY_MAX = 180;

export const listCarousels = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("carousels")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  });

export const getCarousel = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { data: out, error } = await context.supabase
      .from("carousels")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    return out;
  });

const SlideSchema = z.object({
  title: z.string().max(200),
  body: z.string().max(600),
});

const SaveInput = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  template: z.enum(["bold", "minimal", "editorial"]).default("bold"),
  slides: z.array(SlideSchema).min(1).max(12),
  status: z.enum(["draft", "ready", "posted"]).default("draft"),
});

export const saveCarousel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SaveInput.parse(input))
  .handler(async ({ context, data }) => {
    await requireTier(context.supabase, context.userId, "growth");
    const row = {
      user_id: context.userId,
      title: data.title,
      template: data.template,
      slides: data.slides,
      status: data.status,
      scheduled_at: null,
    };
    if (data.id) {
      const { data: out, error } = await context.supabase
        .from("carousels")
        .update(row)
        .eq("id", data.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return out;
    }
    const { data: out, error } = await context.supabase
      .from("carousels")
      .insert(row)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return out;
  });

export const deleteCarousel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("carousels").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const generateCarouselSlides = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        source: z.string().min(20).max(20000),
        slideCount: z.number().int().min(5).max(8).default(6),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    await requireTier(context.supabase, context.userId, "growth");
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const { data: samples } = await context.supabase
      .from("voice_samples")
      .select("content")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(8);
    const voiceBlock =
      samples && samples.length > 0
        ? `\n\nMirror the vocabulary, cadence and opinions in these real posts by the author:\n\n${samples
            .map((s, i) => `--- Sample ${i + 1} ---\n${s.content}`)
            .join("\n\n")}`
        : "";

    const system = `You are Postpilot, an expert LinkedIn ghostwriter turning a topic or long-form text into a scroll-stopping LinkedIn CAROUSEL of exactly ${data.slideCount} slides.

Rules for the deck:
- Portrait 4:5 slides. Text MUST stay short so it's readable on mobile.
- Slide 1 is the cover: a 3-8 word hook headline (max ${SLIDE_TITLE_MAX} chars), plus a 6-14 word subtitle (max ${SLIDE_BODY_MAX} chars).
- Slides 2 to ${data.slideCount - 1} each teach ONE idea. Title = 3-8 word punchy label (max ${SLIDE_TITLE_MAX} chars). Body = 1-2 short lines, max ${SLIDE_BODY_MAX} characters. NEVER exceed this.
- Last slide is a CTA: ask the reader to comment, follow, or DM. Title = short imperative, body = 1 line under ${SLIDE_BODY_MAX} chars.
- No hashtags, no emojis, no quotation marks.
- Plain text only. Use line breaks with \\n inside body strings when needed.

Return STRICT JSON, no prose:
{"title":"short deck title","slides":[{"title":"...","body":"..."}]}

Return exactly ${data.slideCount} slides.${voiceBlock}`;

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
          { role: "user", content: data.source },
        ],
        temperature: 0.85,
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      if (res.status === 429) throw new Error("Rate limited — try again in a minute.");
      if (res.status === 402) throw new Error("AI credits exhausted. Add credits in workspace billing.");
      throw new Error(`Carousel generation failed (${res.status}): ${t.slice(0, 200)}`);
    }
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = json.choices?.[0]?.message?.content ?? "";
    let parsed: { title?: string; slides?: Array<{ title?: string; body?: string }> } = {};
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
    const slides = (parsed.slides ?? [])
      .map((s) => ({
        title: (s.title ?? "").toString().trim(),
        body: (s.body ?? "").toString().trim(),
      }))
      .filter((s) => s.title.length > 0 || s.body.length > 0)
      .slice(0, data.slideCount);
    if (slides.length < 3) throw new Error("AI didn't return enough slides — try again.");
    return {
      title: (parsed.title ?? "Untitled carousel").toString().slice(0, 200),
      slides,
    };
  });

/**
 * LinkedIn's API doesn't support publishing document/PDF posts, so carousels
 * are never auto-posted. Instead we log a row in `posts` with format='carousel'
 * and status='draft' once the user downloads the PDF, so the deck appears on
 * the Dashboard/Calendar as "ready to post manually".
 */
export const saveCarouselAsPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        caption: z.string().max(3000).default(""),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    await requireTier(context.supabase, context.userId, "growth");
    // Look up the carousel to get title (for post content fallback).
    const { data: carousel, error: cErr } = await context.supabase
      .from("carousels")
      .select("title")
      .eq("id", data.id)
      .single();
    if (cErr) throw new Error(cErr.message);

    const content = data.caption.trim() || carousel.title || "New carousel";

    // Upsert: one post row per carousel. Reuse existing if present.
    const { data: existing } = await context.supabase
      .from("posts")
      .select("id, status")
      .eq("carousel_id", data.id)
      .maybeSingle();

    if (existing) {
      // Don't downgrade a "posted" post back to draft.
      const nextStatus = existing.status === "posted" ? "posted" : "draft";
      const { error } = await context.supabase
        .from("posts")
        .update({ content, format: "carousel", status: nextStatus })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
      await context.supabase.from("carousels").update({ status: "ready" }).eq("id", data.id);
      return { ok: true, postId: existing.id };
    }

    const { data: inserted, error } = await context.supabase
      .from("posts")
      .insert({
        user_id: context.userId,
        content,
        format: "carousel",
        status: "draft",
        carousel_id: data.id,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await context.supabase.from("carousels").update({ status: "ready" }).eq("id", data.id);
    return { ok: true, postId: inserted.id };
  });

/** User confirms they uploaded the PDF to LinkedIn themselves. */
export const markCarouselPosted = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const nowIso = new Date().toISOString();
    const { error: cErr } = await context.supabase
      .from("carousels")
      .update({ status: "posted", posted_at: nowIso })
      .eq("id", data.id);
    if (cErr) throw new Error(cErr.message);
    const { error: pErr } = await context.supabase
      .from("posts")
      .update({ status: "posted", posted_at: nowIso })
      .eq("carousel_id", data.id);
    if (pErr) throw new Error(pErr.message);
    return { ok: true };
  });

/**
 * Signed URL for the user's brand logo so the client can render it into slides
 * without exposing the private bucket path publicly.
 */
export const getBrandLogoUrl = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ path: z.string() }).parse(input))
  .handler(async ({ context, data }) => {
    const { data: signed, error } = await context.supabase.storage
      .from("brand-assets")
      .createSignedUrl(data.path, 3600);
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl };
  });