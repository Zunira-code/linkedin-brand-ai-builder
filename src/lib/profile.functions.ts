import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("*")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        display_name: z.string().max(120).optional(),
        brand_voice: z.string().max(2000).optional(),
        timezone: z.string().max(60).optional(),
        brand_logo_url: z.string().url().nullable().optional(),
        brand_primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
        brand_secondary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
        brand_accent_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
        brand_font: z.enum(["inter", "space-grotesk", "dm-serif", "geist", "georgia"]).nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { data: out, error } = await context.supabase
      .from("profiles")
      .update(data)
      .eq("id", context.userId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return out;
  });

/**
 * Kick off the per-user LinkedIn OAuth flow. Returns an authorize URL the
 * browser opens in a popup. The callback route completes the exchange and
 * stores tokens keyed by user id.
 */
export const startLinkedInOAuth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ origin: z.string().url() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const { signState, buildAuthorizeUrl } = await import("@/lib/linkedin-auth.server");
    const nonce = crypto.randomUUID();
    const state = signState({ userId: context.userId, origin: data.origin, nonce });
    const redirectUri = `${data.origin}/api/public/linkedin/callback`;
    const authorizationUrl = buildAuthorizeUrl({ redirectUri, state });
    return { authorizationUrl };
  });

export const disconnectLinkedIn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ linkedin_urn: null })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("linkedin_connections").delete().eq("user_id", context.userId);
    return { ok: true };
  });

export const getLinkedInStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("profiles")
      .select("linkedin_urn, display_name, avatar_url")
      .eq("id", context.userId)
      .maybeSingle();
    // "Connected" must reflect whether we actually hold a per-user OAuth token
    // (linkedin_connections row). Legacy users with only profiles.linkedin_urn
    // set can't publish/sync until they reconnect, so don't advertise them as
    // connected.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: conn } = await supabaseAdmin
      .from("linkedin_connections")
      .select("user_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    return {
      connected: !!conn && !!data?.linkedin_urn,
      name: data?.display_name ?? null,
      avatar: data?.avatar_url ?? null,
    };
  });