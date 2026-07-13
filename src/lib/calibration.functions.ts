import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText } from "ai";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type Calibration = {
  niche: string;
  audience: string;
  voice: string;
  hooks: string[];
  topics: string[];
  brand_voice_text: string;
  calibrated_at: string;
};

const Input = z.object({
  profileText: z.string().max(20000).optional().default(""),
  profileUrl: z
    .preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
      z.string().url().max(500).optional())
    .transform((v) => v ?? ""),
});
async function scanLinkedInUrl(url: string): Promise<string> {
  if (!url) return "";
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; PostpilotBot/1.0; +https://postpilot.app)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return `LinkedIn URL: ${url} (fetch ${res.status})`;
    const html = await res.text();
    const pick = (re: RegExp) => {
      const m = html.match(re);
      return m?.[1]?.replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').trim() ?? "";
    };
    const title = pick(/<meta property="og:title" content="([^"]+)"/i) || pick(/<title>([^<]+)<\/title>/i);
    const desc = pick(/<meta property="og:description" content="([^"]+)"/i) ||
      pick(/<meta name="description" content="([^"]+)"/i);
    // Vanity name from /in/<slug>
    const slug = url.match(/\/in\/([^/?#]+)/i)?.[1] ?? "";
    return [
      `LinkedIn URL: ${url}`,
      slug ? `Vanity handle: ${slug}` : "",
      title ? `Page title: ${title}` : "",
      desc ? `Page description: ${desc}` : "",
    ].filter(Boolean).join("\n");
  } catch (e) {
    const slug = url.match(/\/in\/([^/?#]+)/i)?.[1] ?? "";
    return [
      `LinkedIn URL: ${url}`,
      slug ? `Vanity handle: ${slug}` : "",
      `Note: URL was not directly scannable (${e instanceof Error ? e.message : "network"}); infer from handle and any pasted text.`,
    ].filter(Boolean).join("\n");
  }
}

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("AI did not return JSON");
  return JSON.parse(raw.slice(start, end + 1));
}

export const runCalibration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ context, data }): Promise<Calibration> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    // Pull whatever we can from LinkedIn userinfo (name, picture, email).
    let liName = "";
    let liEmail = "";
    try {
      const { getUserInfo } = await import("@/lib/linkedin.server");
      const info = await getUserInfo();
      liName = info.name ?? "";
      liEmail = info.email ?? "";
    } catch {
      /* LinkedIn not connected — proceed with pasted text only */
    }

    const urlSignal = await scanLinkedInUrl(data.profileUrl);
    const source = [
      liName ? `LinkedIn name: ${liName}` : "",
      liEmail ? `Email domain hint: ${liEmail.split("@")[1] ?? ""}` : "",
      urlSignal,
      data.profileText ? `Profile / recent posts pasted by user:\n${data.profileText}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    if (!source.trim()) {
      throw new Error(
        "Nothing to calibrate from. Paste your LinkedIn URL, or your headline / about / a few recent posts.",
      );
    }

    const { createLovableAiGatewayProvider } = await import("@/lib/ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-3-flash-preview");

    const prompt = `You are analyzing a LinkedIn creator to calibrate an AI ghostwriter to their voice and niche.

SOURCE MATERIAL:
${source}

Do a deep read. Then output ONLY valid JSON with this exact shape:
{
  "niche": "one short phrase for their specific niche (e.g. 'B2B SaaS growth for early-stage founders')",
  "audience": "who their content should target (1 sentence)",
  "voice": "3-6 concrete voice traits, comma-separated (e.g. 'short sentences, contrarian takes, self-deprecating humor, no jargon')",
  "hooks": ["6 opening-line hook patterns that would go viral for THIS person's niche — first-person, specific, scroll-stopping"],
  "topics": ["10 viral post topic ideas tailored to their niche and audience — each a full sentence someone would actually want to write about"]
}

Rules:
- Be specific to the person and their niche. No generic advice.
- Hooks must be usable as-is as the first line of a post.
- Topics must be concrete post ideas, not categories.
- Output JSON only. No prose, no code fences.`;

    const { text } = await generateText({ model, prompt, temperature: 0.7 });
    const parsed = extractJson(text) as {
      niche?: string;
      audience?: string;
      voice?: string;
      hooks?: unknown;
      topics?: unknown;
    };

    const hooks = Array.isArray(parsed.hooks) ? parsed.hooks.map(String).slice(0, 8) : [];
    const topics = Array.isArray(parsed.topics) ? parsed.topics.map(String).slice(0, 12) : [];
    const niche = String(parsed.niche ?? "").trim();
    const audience = String(parsed.audience ?? "").trim();
    const voice = String(parsed.voice ?? "").trim();

    const brand_voice_text = [
      `Niche: ${niche}`,
      `Target audience: ${audience}`,
      `Voice traits: ${voice}`,
      hooks.length ? `Signature hook patterns:\n- ${hooks.join("\n- ")}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const calibration: Calibration = {
      niche,
      audience,
      voice,
      hooks,
      topics,
      brand_voice_text,
      calibrated_at: new Date().toISOString(),
    };

    const { error } = await context.supabase
      .from("profiles")
      .update({ brand_voice: brand_voice_text, calibration })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);

    return calibration;
  });

export const getCalibration = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Calibration | null> => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("calibration")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data?.calibration as Calibration | null) ?? null;
  });