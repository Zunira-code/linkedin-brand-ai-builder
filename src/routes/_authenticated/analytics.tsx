import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  Eye,
  BarChart3,
  UserPlus,
  Activity,
  Linkedin,
  TrendingUp,
  TrendingDown,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { getAnalytics } from "@/lib/analytics.functions";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Postpilot" }] }),
  component: Analytics,
});

const RANGE_OPTIONS = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "Last 12 months", days: 365 },
];

function Analytics() {
  const fn = useServerFn(getAnalytics);
  const [rangeDays, setRangeDays] = useState(30);
  const q = useQuery({
    queryKey: ["analytics", rangeDays],
    queryFn: () => fn({ data: { rangeDays } }),
  });
  const data = q.data;

  if (data && !data.isConnected) {
    return (
      <AppShell title="Analytics">
        <ConnectEmptyState />
      </AppShell>
    );
  }

  const kpis = data?.kpis;
  const rangeLabel = RANGE_OPTIONS.find((r) => r.days === rangeDays)?.label ?? "Last 30 days";

  return (
    <AppShell title="Analytics">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            LinkedIn performance · <span className="text-foreground">{rangeLabel}</span>
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-border bg-card p-1">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.days}
              onClick={() => setRangeDays(opt.days)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                rangeDays === opt.days
                  ? "bg-brand text-brand-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* KPI stack — left */}
        <div className="grid gap-4 lg:col-span-5">
          <Kpi
            icon={Eye}
            label="Profile Views"
            value={fmt(kpis?.profile_views.value)}
            trend={kpis ? { pct: kpis.profile_views.trendPct } : undefined}
          />
          <Kpi
            icon={BarChart3}
            label="Post Impressions"
            value={fmt(kpis?.post_impressions.value)}
            trend={kpis ? { pct: kpis.post_impressions.trendPct } : undefined}
          />
          <Kpi
            icon={UserPlus}
            label="Followers Gained"
            value={kpis ? `+${fmt(kpis.followers_gained.value)}` : "—"}
            trend={kpis ? { pct: kpis.followers_gained.trendPct } : undefined}
          />
          <Kpi
            icon={Activity}
            label="Avg. Engagement"
            value={kpis ? `${kpis.avg_engagement.value}%` : "—"}
            trend={kpis ? { pp: kpis.avg_engagement.trendPp } : undefined}
          />
        </div>

        {/* Follower growth chart — right */}
        <div className="rounded-2xl border border-border bg-card p-6 lg:col-span-7">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold">Follower growth</h2>
              <p className="text-xs text-muted-foreground">Trailing 12 months</p>
            </div>
            {data && (
              <div className="rounded-lg border border-success/30 bg-success/10 px-3 py-1.5 text-xs font-medium text-success">
                +{fmt(Math.max(0, data.followerGrowth.growth12mo))} in 12 months
              </div>
            )}
          </div>
          <div className="mt-6 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.followerGrowth.months ?? []}>
                <defs>
                  <linearGradient id="followerFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--brand)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--brand)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} width={44} />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "var(--muted-foreground)" }}
                />
                <Area
                  type="monotone"
                  dataKey="followers"
                  stroke="var(--brand)"
                  strokeWidth={2.5}
                  fill="url(#followerFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top performing posts */}
      <div className="mt-6 rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="font-display text-lg font-semibold">Top performing posts</h2>
            <p className="text-xs text-muted-foreground">Ranked by impressions</p>
          </div>
        </div>
        {data && data.topPosts.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">
            <Sparkles className="mx-auto mb-3 h-6 w-6 text-brand" />
            No post metrics cached yet. Once your published posts sync, your top performers appear here.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {(data?.topPosts ?? []).map((post, idx) => (
              <li key={post.post_urn} className="flex items-start gap-4 px-6 py-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/10 font-display text-sm font-semibold text-brand">
                  {idx + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm text-foreground">
                    {post.content?.trim() || "Untitled post"}
                  </p>
                  {post.published_at && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(post.published_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-6 text-right">
                  <div>
                    <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                      <BarChart3 className="h-3 w-3" /> Impressions
                    </div>
                    <div className="font-display text-sm font-semibold">{fmt(post.impressions)}</div>
                  </div>
                  <div>
                    <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                      <MessageSquare className="h-3 w-3" /> Comments
                    </div>
                    <div className="font-display text-sm font-semibold">{fmt(post.comments)}</div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {data?.linkedInError && (
        <p className="mt-4 text-xs text-destructive">LinkedIn API error: {data.linkedInError}</p>
      )}
    </AppShell>
  );
}

function ConnectEmptyState() {
  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-10 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand/10 text-brand">
        <Linkedin className="h-6 w-6" />
      </div>
      <h2 className="mt-5 font-display text-2xl font-semibold">Connect your LinkedIn account</h2>
      <p className="mt-3 text-sm text-muted-foreground">
        Analytics uses LinkedIn's official OAuth 2.0 API with your permission
        (<code className="rounded bg-muted px-1 py-0.5 text-xs">r_member_postAnalytics</code>,{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">r_member_social</code>). We cache
        metrics on our servers so we never scrape LinkedIn and stay within rate limits.
      </p>
      <Button asChild className="mt-6 gap-2">
        <Link to="/settings">
          <Linkedin className="h-4 w-4" />
          Connect LinkedIn Account
        </Link>
      </Button>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  trend,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  trend?: { pct?: number; pp?: number };
}) {
  const pct = trend?.pct;
  const pp = trend?.pp;
  const positive = (pct ?? pp ?? 0) >= 0;
  const TrendIcon = positive ? TrendingUp : TrendingDown;
  const trendLabel =
    pct !== undefined
      ? `${positive ? "+" : ""}${pct.toFixed(0)}% vs last period`
      : pp !== undefined
        ? `${positive ? "+" : ""}${pp.toFixed(1)}pp vs last period`
        : null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3 font-display text-3xl font-semibold tracking-tight">{value}</div>
      {trendLabel && (
        <div
          className={cn(
            "mt-2 inline-flex items-center gap-1 text-xs font-medium",
            positive ? "text-success" : "text-destructive",
          )}
        >
          <TrendIcon className="h-3 w-3" />
          {trendLabel}
        </div>
      )}
    </div>
  );
}

function fmt(n: number | undefined | null): string {
  if (n === undefined || n === null) return "—";
  return new Intl.NumberFormat("en-US").format(n);
}