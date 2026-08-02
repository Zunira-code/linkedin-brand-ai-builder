import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BASE_RULES = `You are a senior LinkedIn brand strategist writing for a real professional.

Non-negotiables:
- Sound human. Contractions, specifics, real opinions. Never corporate filler.
- Banned phrases: "passionate about", "results-driven professional", "leverage synergies", "in today's fast-paced world", "seasoned", "dynamic professional".
- No hashtags unless explicitly asked. At most one emoji, only if it genuinely fits.
- Prefer concrete nouns, numbers and outcomes over adjectives.
- Never invent achievements, employers, metrics or credentials the user didn't give you.`;

async function callAi(system: string, user: string, temperature: number) {
  const key = process.env['LOVABLE_API_KEY'];
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Lovable-API-Key": key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3.6-flash",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature,
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    if (res.status === 429) throw new Error("Rate limited — try again in a minute.");
    if (res.status === 402) throw new Error("AI credits exhausted. Add credits in workspace billing.");
    throw new Error(`AI request failed (${res.status}): ${t.slice(0, 200)}`);
  }
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const raw = json.choices?.[0]?.message?.content ?? "";
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]) as Record<string, unknown>;
      } catch {
        /* ignore */
      }
    }
    return {};
  }
}

async function voiceBlock(
  supabase: { from: (t: string) => any },
  userId: string,
  useVoice: boolean,
) {
  if (!useVoice) return "";
  const { data: samples } = await supabase
    .from("voice_samples")
    .select("content")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(8);
  if (!samples || samples.length === 0) return "";
  return `\n\nBelow are real posts written by this person. Mirror their vocabulary, sentence length and cadence — do not copy their content.\n\n${samples
    .map((s: { content: string }, i: number) => `--- Sample ${i + 1} ---\n${s.content}`)
    .join("\n\n")}`;
}

function strList(value: unknown, max: number): string[] {
  const list = Array.isArray(value) ? value : [];
  return list
    .map((v) => (typeof v === "string" ? v : String((v as { text?: string } | null)?.text ?? "")))
    .map((s) => s.replace(/^["'`]+|["'`]+$/g, "").trim())
    .filter(Boolean)
    .slice(0, max);
}

/* ---------------- Headlines ---------------- */

export const HEADLINE_STYLES = [
  { key: "results", label: "Results-focused" },
  { key: "authority", label: "Authority-based" },
  { key: "story", label: "Story-driven" },
  { key: "keyword", label: "Keyword-optimized" },
  { key: "bold", label: "Bold / contrarian" },
] as const;

const HeadlineInput = z.object({
  current: z.string().max(400).optional(),
  goal: z.string().min(3).max(200),
  industry: z.string().min(2).max(120),
  keywords: z.string().max(400).optional(),
  useVoice: z.boolean().default(true),
});

export const generateHeadlines = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => HeadlineInput.parse(input))
  .handler(async ({ context, data }) => {
    const voice = await voiceBlock(context.supabase, context.userId, data.useVoice);
    const system = `${BASE_RULES}

Write LinkedIn headlines. Return exactly 5 options, one per style, in this order:
1 results (concrete outcomes/numbers), 2 authority (credibility & niche ownership), 3 story (human, first-person angle), 4 keyword (search-friendly: role + specialties separated by | ), 5 bold (a contrarian point of view that still reads professional).

Every headline MUST be under 220 characters and readable on mobile.

Return STRICT JSON only:
{"headlines":[{"style":"results","text":"..."},{"style":"authority","text":"..."},{"style":"story","text":"..."},{"style":"keyword","text":"..."},{"style":"bold","text":"..."}]}${voice}`;
    const user = `Goal: ${data.goal}
Industry: ${data.industry}
${data.current ? `Current headline: ${data.current}` : "Current headline: (none)"}
${data.keywords ? `Strengths / keywords: ${data.keywords}` : ""}`;
    const parsed = await callAi(system, user, 0.9);
    const list = Array.isArray(parsed['headlines']) ? (parsed['headlines'] as unknown[]) : [];
    const headlines = list
      .map((h) => {
        const o = (h ?? {}) as { style?: string; text?: string };
        return {
          style: String(o.style ?? "results"),
          text: String(o.text ?? "").trim().slice(0, 220),
        };
      })
      .filter((h) => h.text.length > 0)
      .slice(0, 5);
    if (headlines.length === 0) throw new Error("AI didn't return usable headlines — try again.");
    return { headlines };
  });

/* ---------------- About ---------------- */

const AboutInput = z.object({
  current: z.string().max(6000).optional(),
  audience: z.string().min(2).max(120),
  goal: z.string().min(3).max(300),
  tone: z.enum(["professional", "confident", "humble", "bold"]).default("professional"),
  length: z.enum(["short", "medium", "long"]).default("medium"),
  useVoice: z.boolean().default(true),
});

export const generateAbout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AboutInput.parse(input))
  .handler(async ({ context, data }) => {
    const voice = await voiceBlock(context.supabase, context.userId, data.useVoice);
    const wordTarget =
      data.length === "short" ? "90-130 words" : data.length === "long" ? "280-350 words" : "170-230 words";
    const system = `${BASE_RULES}

Write LinkedIn "About" sections. Produce exactly 4 versions, in this order:
1 storytelling (personal journey + what it taught them)
2 results (achievements, numbers, impact — only using facts given)
3 authority (thought leadership, point of view, who they help)
4 conversational (warm, approachable, direct address)

Formatting rules for every version:
- Open with a hook line that works before the "see more" cut (first ~200 characters).
- Short paragraphs of 1-3 sentences separated by a blank line (use \\n\\n).
- Optional 3-4 item list using "→ " bullets where it helps scanning.
- End with a clear call to action matching the stated goal.
- Length target: ${wordTarget}. Tone: ${data.tone}.

Return STRICT JSON only:
{"versions":[{"kind":"storytelling","text":"..."},{"kind":"results","text":"..."},{"kind":"authority","text":"..."},{"kind":"conversational","text":"..."}]}${voice}`;
    const user = `Target audience: ${data.audience}
Main goal of the About section: ${data.goal}
${data.current ? `Current About section:\n${data.current}` : "Current About section: (none provided — infer only from the goal and audience, invent nothing factual)"}`;
    const parsed = await callAi(system, user, 0.85);
    const list = Array.isArray(parsed['versions']) ? (parsed['versions'] as unknown[]) : [];
    const versions = list
      .map((v) => {
        const o = (v ?? {}) as { kind?: string; text?: string };
        return { kind: String(o.kind ?? "storytelling"), text: String(o.text ?? "").trim() };
      })
      .filter((v) => v.text.length > 0)
      .slice(0, 4);
    if (versions.length === 0) throw new Error("AI didn't return usable About versions — try again.");
    return { versions };
  });

const RewriteInput = z.object({
  text: z.string().min(1).max(8000),
  instruction: z.string().min(1).max(200),
});

export const refineText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RewriteInput.parse(input))
  .handler(async ({ data }) => {
    const system = `${BASE_RULES}

Revise the given LinkedIn profile text based on the instruction. Keep what works, change only what's asked. Preserve blank-line paragraph formatting.

Return STRICT JSON only: {"text":"revised text"}`;
    const parsed = await callAi(system, `Instruction: ${data.instruction}\n\nText:\n${data.text}`, 0.7);
    const text = String(parsed['text'] ?? "").trim();
    if (!text) throw new Error("AI didn't return a revision — try again.");
    return { text };
  });

/* ---------------- Featured ---------------- */

const FeaturedInput = z.object({
  assets: z.array(z.string().max(60)).min(1).max(12),
  industry: z.string().min(2).max(120),
  goal: z.string().min(3).max(300),
  notes: z.string().max(1000).optional(),
});

export const recommendFeatured = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => FeaturedInput.parse(input))
  .handler(async ({ data }) => {
    const system = `${BASE_RULES}

Recommend what this person should pin to the LinkedIn "Featured" section. Return 5 recommendations, ordered by impact for their stated goal.

For each: a short suggested title (max 60 chars), a suggested description (max 200 chars, written as real copy they can paste), what exactly to pin, and why it works for their audience.

Return STRICT JSON only:
{"items":[{"title":"...","description":"...","pin":"...","why":"..."}]}`;
    const user = `Industry: ${data.industry}
Goal: ${data.goal}
Content they already have: ${data.assets.join(", ")}
${data.notes ? `Extra context: ${data.notes}` : ""}`;
    const parsed = await callAi(system, user, 0.8);
    const list = Array.isArray(parsed['items']) ? (parsed['items'] as unknown[]) : [];
    const items = list
      .map((v) => {
        const o = (v ?? {}) as Record<string, unknown>;
        return {
          title: String(o['title'] ?? "").trim(),
          description: String(o['description'] ?? "").trim(),
          pin: String(o['pin'] ?? "").trim(),
          why: String(o['why'] ?? "").trim(),
        };
      })
      .filter((v) => v.title.length > 0)
      .slice(0, 6);
    if (items.length === 0) throw new Error("AI didn't return recommendations — try again.");
    return { items };
  });

const DescribeInput = z.object({
  title: z.string().min(2).max(160),
  context: z.string().max(1000).optional(),
});

export const describeFeaturedItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => DescribeInput.parse(input))
  .handler(async ({ data }) => {
    const system = `${BASE_RULES}

Write one short description for a LinkedIn Featured item: max 200 characters, specific, makes someone want to click.

Return STRICT JSON only: {"text":"..."}`;
    const parsed = await callAi(
      system,
      `Featured item: ${data.title}\n${data.context ? `Context: ${data.context}` : ""}`,
      0.85,
    );
    const text = String(parsed['text'] ?? "").trim().slice(0, 220);
    if (!text) throw new Error("AI didn't return a description — try again.");
    return { text };
  });

/* ---------------- Banner taglines ---------------- */

const BannerInput = z.object({
  industry: z.string().min(2).max(120),
  goal: z.string().min(3).max(300),
  useVoice: z.boolean().default(true),
});

export const generateBannerTaglines = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => BannerInput.parse(input))
  .handler(async ({ context, data }) => {
    const voice = await voiceBlock(context.supabase, context.userId, data.useVoice);
    const system = `${BASE_RULES}

Write 3 tagline options for a LinkedIn banner image. Each: max 60 characters, readable at small size, no quotes around it. One should state the value proposition, one should be a point of view, one should be a clear availability/CTA line.

Also add one line of banner art direction for this industry.

Return STRICT JSON only: {"taglines":["...","...","..."],"artDirection":"..."}${voice}`;
    const parsed = await callAi(system, `Industry: ${data.industry}\nGoal: ${data.goal}`, 0.9);
    const taglines = strList(parsed['taglines'], 3).map((t) => t.slice(0, 80));
    if (taglines.length === 0) throw new Error("AI didn't return taglines — try again.");
    return { taglines, artDirection: String(parsed['artDirection'] ?? "").trim() };
  });

/* ---------------- Profile kit ---------------- */

export const listProfileKit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profile_kit_items")
      .select("id, kind, title, content, meta, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { items: data ?? [] };
  });

const SaveInput = z.object({
  kind: z.enum(["headline", "about", "featured", "banner_tagline"]),
  title: z.string().max(200).optional(),
  content: z.string().min(1).max(8000),
});

export const saveProfileKitItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SaveInput.parse(input))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("profile_kit_items").insert({
      user_id: context.userId,
      kind: data.kind,
      title: data.title ?? null,
      content: data.content,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const DeleteInput = z.object({ id: z.string().uuid() });

export const deleteProfileKitItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => DeleteInput.parse(input))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("profile_kit_items")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });