import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin only");
}

export const amIAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    return { admin: !!data };
  });

export const listAllProfiles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("profiles")
      .select("id, display_name, avatar_url, is_approved, created_at, linkedin_urn, subscription_tier")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const setUserApproval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        user_id: z.string().uuid(),
        is_approved: z.boolean(),
        subscription_tier: z.enum(["starter", "growth", "agency"]).optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const update: { is_approved: boolean; subscription_tier?: "starter" | "growth" | "agency" } = {
      is_approved: data.is_approved,
    };
    if (data.is_approved && data.subscription_tier) {
      update.subscription_tier = data.subscription_tier;
    }
    const { error } = await context.supabase
      .from("profiles")
      .update(update)
      .eq("id", data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const inviteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ email: z.string().email() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const siteUrl =
      process.env.SITE_URL ||
      "https://linkedin-brand-ai-builder.lovable.app";
    const { data: out, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      data.email,
      { redirectTo: `${siteUrl}/auth` },
    );
    if (error) throw new Error(error.message);
    // Pre-approve invited users so they get instant access on first sign-in
    if (out?.user?.id) {
      await supabaseAdmin
        .from("profiles")
        .upsert({ id: out.user.id, is_approved: true }, { onConflict: "id" });
    }
    return { ok: true, email: data.email };
  });