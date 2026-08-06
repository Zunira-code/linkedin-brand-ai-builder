import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const COMMENT_STYLES = {
  thoughtful: "Thoughtful / insightful — add a sharp, specific perspective that deepens the discussion.",
  supportive: "Supportive + add value — affirm the author, then add one concrete extra tip, resource or example.",
  question: "Question-based — respond briefly, then ask one specific, easy-to-answer question that starts a conversation.",
  experience: "Personal experience — share a short, concrete anecdote from your own work that relates to the post.",
  punchy: "Short & punchy — one or two lines, high signal, memorable, no fluff.",
} as const;

export type CommentStyle = keyof typeof COMMENT_STYLES;

function stripHtml(html: string): string {
  const noBlocks = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
  return noBlocks
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

async function callAi(system: string, user: string, temperature: number) {
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
    throw new Error(`Comment generation failed (${res.status}): ${t.slice(0, 200)}`);
  }
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const raw = json.choices?.[0]?.message?.content ?? "";
  try {
    return JSON.parse(raw) as { comments?: unknown };
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]) as { comments?: unknown };
      } catch {
        /* ignore */
      }
    }
    return {};
  }
}

function normalizeComments(parsed: { comments?: unknown }, max: number): string[] {
  const list = Array.isArray(parsed.comments) ? parsed.comments : [];
  return list
    .map((c) => {
      const text = typeof c === "string" ? c : ((c as { text?: string } | null)?.text ?? "");
      return text.toString().replace(/^["'`]+|["'`]+$/g, "").trim();
    })
    .filter((t) => t.length > 0)
    .slice(0, max);
}

const BASE_RULES = `You write LinkedIn comments on OTHER PEOPLE'S posts, as a real professional — never as a bot.

Hard rules for every comment:
- Reference something specific from the post. Never generic ("Great post!", "Well said", "Thanks for sharing").
- Plain text. No hashtags. At most one emoji, and only if it truly fits.
- 1-5 short sentences, under 500 characters, unless the style says shorter.
- No self-promotion, no links, no tagging strangers.
- Sound human: contractions, natural rhythm, an actual opinion.`;

const GenerateInput = z
  .object({
    postText: z.string().max(20000).optional(),
    url: z.string().url().optional(),
    style: z.enum(["thoughtful", "supportive", "question", "experience", "punchy"]),
    useVoice: z.boolean().default(true),
  })
  .refine((v) => Boolean(v.url) || Boolean(v.postText && v.postText.trim().length >= 30), {
    message: "Paste the post text (30+ characters) or a link to it.",
  });

export const generateComments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => GenerateInput.parse(input))
  .handler(async ({ context, data }) => {
    let source = (data.postText ?? "").trim();
    if (!source && data.url) {
      try {
        const { safeFetch } = await import("@/lib/ssrf.server");
        const res = await safeFetch(data.url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; PostpilotBot/1.0; +https://postpilot.app)",
            Accept: "text/html,application/xhtml+xml",
          },
        });
        if (!res.ok) throw new Error(`Fetch failed (${res.status})`);
        source = stripHtml(await res.text());
      } catch (e) {
        throw new Error(
          `Couldn't read that link (${e instanceof Error ? e.message : String(e)}). LinkedIn blocks most bots — paste the post text instead.`,
        );
      }
    }
    if (!source || source.trim().length < 30) {
      throw new Error("Not enough post content to comment on — paste the post text.");
    }

    let voiceBlock = "";
    if (data.useVoice) {
      const { data: samples } = await context.supabase
        .from("voice_samples")
        .select("content")
        .eq("user_id", context.userId)
        .order("created_at", { ascending: false })
        .limit(8);
      if (samples && samples.length > 0) {
        voiceBlock = `\n\nBelow are real posts written by the commenter. Mirror their vocabulary, sentence length and cadence.\n\n${samples
          .map((s, i) => `--- Sample ${i + 1} ---\n${s.content}`)
          .join("\n\n")}`;
      }
    }

    const system = `${BASE_RULES}

Style for this batch: ${COMMENT_STYLES[data.style]}

Return exactly 3 clearly different comment options as STRICT JSON and nothing else:
{"comments":["...","...","..."]}${voiceBlock}`;

    const parsed = await callAi(system, `Post to comment on:\n\n${source.slice(0, 8000)}`, 0.85);
    const comments = normalizeComments(parsed, 3);
    if (comments.length === 0) throw new Error("AI didn't return usable comments — try again.");
    return { comments };
  });

const RefineInput = z.object({
  comment: z.string().min(1).max(2000),
  instruction: z.string().min(1).max(200),
  postText: z.string().max(20000).optional(),
});

export const refineComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RefineInput.parse(input))
  .handler(async ({ data }) => {
    const system = `${BASE_RULES}

You are revising ONE existing comment based on the user's instruction. Keep what works, change only what the instruction asks.

Return STRICT JSON and nothing else: {"comments":["revised comment"]}`;
    const user = `${data.postText ? `Original post:\n\n${data.postText.slice(0, 6000)}\n\n` : ""}Current comment:\n${data.comment}\n\nInstruction: ${data.instruction}`;
    const parsed = await callAi(system, user, 0.7);
    const [comment] = normalizeComments(parsed, 1);
    if (!comment) throw new Error("AI didn't return a revision — try again.");
    return { comment };
  });