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
    const email = data.email.trim().toLowerCase();

    // Helper: pre-approve a user by id so they get instant access.
    const preApprove = async (userId: string) => {
      await supabaseAdmin
        .from("profiles")
        .upsert({ id: userId, is_approved: true }, { onConflict: "id" });
    };

    // Helper: find an existing auth user by email (paginates as needed).
    const findExistingUserId = async (): Promise<string | null> => {
      for (let page = 1; page <= 20; page++) {
        const { data: list, error: listErr } =
          await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
        if (listErr) throw new Error(listErr.message);
        const match = list?.users?.find(
          (u) => (u.email ?? "").toLowerCase() === email,
        );
        if (match) return match.id;
        if (!list?.users || list.users.length < 200) return null;
      }
      return null;
    };

    const { data: out, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      { redirectTo: `${siteUrl}/auth` },
    );

    if (error) {
      // Already registered → just pre-approve them so they can sign in.
      const msg = error.message?.toLowerCase() ?? "";
      const alreadyExists =
        msg.includes("already been registered") ||
        msg.includes("already registered") ||
        msg.includes("already exists") ||
        msg.includes("user already");
      if (!alreadyExists) throw new Error(error.message);
      const existingId = await findExistingUserId();
      if (existingId) {
        await preApprove(existingId);
        return { ok: true, email, alreadyExisted: true };
      }
      throw new Error(error.message);
    }

    if (out?.user?.id) await preApprove(out.user.id);
    return { ok: true, email, alreadyExisted: false };
  });