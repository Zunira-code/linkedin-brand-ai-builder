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

export const connectLinkedIn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getUserInfo } = await import("@/lib/linkedin.server");
    const info = await getUserInfo();
    await context.supabase
      .from("profiles")
      .update({
        linkedin_urn: info.sub,
        display_name: info.name ?? undefined,
        avatar_url: info.picture ?? undefined,
      })
      .eq("id", context.userId);
    return info;
  });

export const getLinkedInStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("profiles")
      .select("linkedin_urn, display_name, avatar_url")
      .eq("id", context.userId)
      .maybeSingle();
    return {
      connected: !!data?.linkedin_urn,
      name: data?.display_name ?? null,
      avatar: data?.avatar_url ?? null,
    };
  });