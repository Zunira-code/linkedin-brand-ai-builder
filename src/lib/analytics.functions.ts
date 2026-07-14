import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { rangeDays?: number } | undefined) => ({
    rangeDays: input?.rangeDays ?? 30,
  }))
  .handler(async ({ context, data }) => {
    const rangeDays = Math.max(7, Math.min(365, data.rangeDays));
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

    // Check LinkedIn OAuth connection in cached table
    // (types will be regenerated after this migration; using loose access here)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const connRes = await sb
      .from("linkedin_connections")
      .select("linkedin_profile_id, token_expires_at, scope")
      .eq("user_id", context.userId)
      .maybeSingle();
    const connection = connRes.data as
      | { linkedin_profile_id: string | null; token_expires_at: string | null; scope: string | null }
      | null;
    // Fall back to profiles.linkedin_urn (set by the existing OAuth connect flow)
    // so users who connected before the linkedin_connections cache existed still
    // see analytics. A cached connection row with a valid token also counts.
    const hasValidCachedConnection = Boolean(
      connection && (!connection.token_expires_at || new Date(connection.token_expires_at) > new Date()),
    );
    const isConnected = hasValidCachedConnection || Boolean(profile?.linkedin_urn);

    // Cached daily metrics (range)
    const sinceDate = new Date(now);
    sinceDate.setDate(now.getDate() - rangeDays);
    const sincePrev = new Date(now);
    sincePrev.setDate(now.getDate() - rangeDays * 2);
    const isoDate = (d: Date) => d.toISOString().slice(0, 10);

    const dailyRes = await sb
      .from("linkedin_daily_metrics")
      .select("metric_date, profile_views, post_impressions, followers, followers_gained, engagement_rate")
      .eq("user_id", context.userId)
      .gte("metric_date", isoDate(sincePrev))
      .order("metric_date", { ascending: true });
    type DailyRow = {
      metric_date: string;
      profile_views: number;
      post_impressions: number;
      followers: number;
      followers_gained: number;
      engagement_rate: number;
    };
    const daily: DailyRow[] = (dailyRes.data as DailyRow[] | null) ?? [];
    const curr = daily.filter((r) => r.metric_date >= isoDate(sinceDate));
    const prev = daily.filter((r) => r.metric_date < isoDate(sinceDate));
    const sum = (rows: DailyRow[], k: keyof DailyRow) =>
      rows.reduce((a, r) => a + Number(r[k] ?? 0), 0);
    const avg = (rows: DailyRow[], k: keyof DailyRow) =>
      rows.length ? sum(rows, k) / rows.length : 0;
    const pct = (a: number, b: number) => (b > 0 ? ((a - b) / b) * 100 : a > 0 ? 100 : 0);

    const kpis = {
      profile_views: {
        value: sum(curr, "profile_views"),
        trendPct: pct(sum(curr, "profile_views"), sum(prev, "profile_views")),
      },
      post_impressions: {
        value: sum(curr, "post_impressions"),
        trendPct: pct(sum(curr, "post_impressions"), sum(prev, "post_impressions")),
      },
      followers_gained: {
        value: sum(curr, "followers_gained"),
        trendPct: pct(sum(curr, "followers_gained"), sum(prev, "followers_gained")),
      },
      avg_engagement: {
        value: Number(avg(curr, "engagement_rate").toFixed(2)),
        trendPp: Number((avg(curr, "engagement_rate") - avg(prev, "engagement_rate")).toFixed(2)),
      },
    };

    // Follower growth: last 12 months (bucket end-of-month followers)
    const months: { month: string; followers: number }[] = [];
    const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyMap = new Map<string, number>();
    daily.forEach((r) => {
      const d = new Date(r.metric_date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const existing = monthlyMap.get(key) ?? 0;
      if (r.followers > existing) monthlyMap.set(key, r.followers);
    });
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now);
      d.setMonth(now.getMonth() - i);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      months.push({ month: monthLabels[d.getMonth()], followers: monthlyMap.get(key) ?? 0 });
    }
    const followerGrowth12mo =
      months[months.length - 1].followers - (months.find((m) => m.followers > 0)?.followers ?? 0);

    // Top performing posts
    const topRes = await sb
      .from("linkedin_posts_metrics")
      .select("post_urn, content, impressions, comments, reactions, published_at")
      .eq("user_id", context.userId)
      .order("impressions", { ascending: false })
      .limit(5);
    const topPosts =
      (topRes.data as
        | Array<{
            post_urn: string;
            content: string | null;
            impressions: number;
            comments: number;
            reactions: number;
            published_at: string | null;
          }>
        | null) ?? [];

    return {
      rangeDays,
      isConnected,
      connection,
      profile,
      linkedInProfile,
      linkedInError,
      counts: {
        drafts: draftCount ?? 0,
        scheduled: scheduledCount ?? 0,
        posted: postedCount ?? 0,
      },
      weeks,
      kpis,
      followerGrowth: { months, growth12mo: followerGrowth12mo },
      topPosts,
    };
  });