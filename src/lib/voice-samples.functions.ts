import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MIN_LEN = 40;
const MAX_LEN = 6000;
const MAX_TOTAL = 40;

function splitPasted(raw: string): string[] {
  return raw
    .split(/\n\s*(?:-{3,}|\*{3,}|={3,})\s*\n|\n{2,}/g)
    .map((s) => s.trim())
    .filter((s) => s.length >= MIN_LEN && s.length <= MAX_LEN);
}

export const listVoiceSamples = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("voice_samples")
      .select("id, content, source, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const addVoiceSamples = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        raw: z.string().optional(),
        samples: z.array(z.string()).optional(),
        source: z.enum(["paste", "linkedin"]).default("paste"),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const fromRaw = data.raw ? splitPasted(data.raw) : [];
    const fromArr = (data.samples ?? [])
      .map((s) => s.trim())
      .filter((s) => s.length >= MIN_LEN && s.length <= MAX_LEN);
    const merged = [...fromRaw, ...fromArr];
    // Dedupe within batch
    const seen = new Set<string>();
    const unique = merged.filter((s) => {
      const k = s.slice(0, 200);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    if (unique.length === 0) {
      throw new Error("No valid samples found. Each post needs at least 40 characters.");
    }

    // Enforce per-user cap.
    const { count } = await context.supabase
      .from("voice_samples")
      .select("*", { count: "exact", head: true })
      .eq("user_id", context.userId);
    const remaining = MAX_TOTAL - (count ?? 0);
    if (remaining <= 0) {
      throw new Error(`Voice sample limit reached (${MAX_TOTAL}). Delete some to add more.`);
    }
    const toInsert = unique.slice(0, remaining).map((content) => ({
      user_id: context.userId,
      content,
      source: data.source,
    }));
    const { data: inserted, error } = await context.supabase
      .from("voice_samples")
      .insert(toInsert)
      .select("id");
    if (error) throw new Error(error.message);
    return { added: inserted?.length ?? 0, skipped: unique.length - (inserted?.length ?? 0) };
  });

export const deleteVoiceSample = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("voice_samples")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const clearVoiceSamples = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("voice_samples")
      .delete()
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const importVoiceSamplesFromLinkedIn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("linkedin_urn")
      .eq("id", context.userId)
      .maybeSingle();
    if (!profile?.linkedin_urn) {
      throw new Error("Connect LinkedIn first, then try again.");
    }
    const { linkedInGet } = await import("@/lib/linkedin.server");
    const authorUrn = profile.linkedin_urn.startsWith("urn:")
      ? profile.linkedin_urn
      : `urn:li:person:${profile.linkedin_urn}`;

    // Try the UGC posts endpoint scoped to this author. Requires
    // r_member_social scope on the LinkedIn connector. If it fails,
    // surface the provider's status so the user knows to paste manually.
    let payload: unknown;
    try {
      const encoded = encodeURIComponent(authorUrn);
      payload = await linkedInGet(
        `/v2/ugcPosts?q=authors&authors=List(${encoded})&count=20&sortBy=LAST_MODIFIED`,
      );
    } catch (e) {
      throw new Error(
        `Couldn't auto-import from LinkedIn (${
          e instanceof Error ? e.message : String(e)
        }). Paste your posts below instead.`,
      );
    }

    const elements = ((payload as { elements?: unknown[] })?.elements ?? []) as Array<{
      specificContent?: {
        "com.linkedin.ugc.ShareContent"?: { shareCommentary?: { text?: string } };
      };
    }>;
    const texts = elements
      .map((el) => el.specificContent?.["com.linkedin.ugc.ShareContent"]?.shareCommentary?.text ?? "")
      .map((s) => s.trim())
      .filter((s) => s.length >= MIN_LEN && s.length <= MAX_LEN);

    if (texts.length === 0) {
      throw new Error("LinkedIn returned no recent posts. Paste your posts below instead.");
    }

    return addVoiceSamples({ data: { samples: texts, source: "linkedin" } });
  });