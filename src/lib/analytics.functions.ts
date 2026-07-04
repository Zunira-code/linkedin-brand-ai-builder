import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("linkedin_urn, display_name, avatar_url")
      .eq("id", context.userId)
      .maybeSingle();

    const { count: draftCount } = await context.supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", context.userId)
      .eq("status", "draft");
    const { count: scheduledCount } = await context.supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", context.userId)
      .eq("status", "scheduled");
    const { count: postedCount } = await context.supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", context.userId)
      .eq("status", "posted");

    let linkedInProfile: { name?: string; picture?: string; email?: string } | null = null;
    let linkedInError: string | null = null;
    if (profile?.linkedin_urn) {
      try {
        const { getUserInfo } = await import("@/lib/linkedin.server");
        linkedInProfile = await getUserInfo();
      } catch (e) {
        linkedInError = e instanceof Error ? e.message : String(e);
      }
    }

    // Last 8 weeks activity from local posts table
    const { data: recent } = await context.supabase
      .from("posts")
      .select("posted_at, status")
      .eq("user_id", context.userId)
      .eq("status", "posted")
      .not("posted_at", "is", null)
      .order("posted_at", { ascending: false })
      .limit(200);
    const weeks: { week: string; count: number }[] = [];
    const now = new Date();
    for (let i = 7; i >= 0; i--) {
      const start = new Date(now);
      start.setDate(now.getDate() - i * 7);
      const label = `${start.getMonth() + 1}/${start.getDate()}`;
      weeks.push({ week: label, count: 0 });
    }
    (recent ?? []).forEach((p) => {
      if (!p.posted_at) return;
      const d = new Date(p.posted_at);
      const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      const bucket = 7 - Math.floor(diffDays / 7);
      if (bucket >= 0 && bucket < weeks.length) weeks[bucket].count += 1;
    });

    return {
      profile,
      linkedInProfile,
      linkedInError,
      counts: {
        drafts: draftCount ?? 0,
        scheduled: scheduledCount ?? 0,
        posted: postedCount ?? 0,
      },
      weeks,
    };
  });