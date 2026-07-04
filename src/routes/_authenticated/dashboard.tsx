import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Calendar, Flame, BarChart3, ArrowRight } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { listPosts } from "@/lib/posts.functions";
import { getAnalytics } from "@/lib/analytics.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Postpilot" }] }),
  component: Dashboard,
});

function Dashboard() {
  const listFn = useServerFn(listPosts);
  const analyticsFn = useServerFn(getAnalytics);
  const posts = useQuery({ queryKey: ["posts"], queryFn: () => listFn() });
  const analytics = useQuery({ queryKey: ["analytics"], queryFn: () => analyticsFn() });

  const stats = [
    { label: "Drafts", value: analytics.data?.counts.drafts ?? 0, icon: Sparkles },
    { label: "Scheduled", value: analytics.data?.counts.scheduled ?? 0, icon: Calendar },
    { label: "Posted", value: analytics.data?.counts.posted ?? 0, icon: BarChart3 },
  ];

  return (
    <AppShell title="Dashboard">
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">{s.label}</div>
              <s.icon className="h-4 w-4 text-brand" />
            </div>
            <div className="mt-2 font-display text-3xl font-semibold">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Recent posts</h2>
            <Link to="/generator"><Button size="sm" className="bg-brand-gradient text-brand-foreground">New post</Button></Link>
          </div>
          <div className="mt-4 divide-y divide-border">
            {(posts.data ?? []).slice(0, 6).map((p) => (
              <div key={p.id} className="flex items-start gap-4 py-3">
                <StatusChip status={p.status} />
                <p className="flex-1 line-clamp-2 text-sm text-foreground/90">{p.content}</p>
                <span className="text-xs text-muted-foreground">
                  {new Date(p.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
            {(!posts.data || posts.data.length === 0) && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No posts yet. <Link to="/generator" className="text-brand hover:underline">Draft your first one →</Link>
              </p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold">Quick actions</h2>
          <div className="mt-4 space-y-2">
            <ActionCard to="/generator" icon={Sparkles} title="Write a new post" desc="AI-drafted in seconds" />
            <ActionCard to="/inspiration" icon={Flame} title="Browse viral hooks" desc="30+ proven patterns" />
            <ActionCard to="/calendar" icon={Calendar} title="Plan next week" desc="Schedule and forget" />
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function ActionCard({ to, icon: Icon, title, desc }: { to: "/generator" | "/inspiration" | "/calendar"; icon: React.ComponentType<{ className?: string }>; title: string; desc: string }) {
  return (
    <Link to={to} className="flex items-center gap-3 rounded-lg border border-border bg-background p-3 transition-colors hover:border-brand/50 hover:bg-accent/40">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/15 text-brand">
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    scheduled: "bg-brand/15 text-brand",
    posted: "bg-success/15 text-success",
    failed: "bg-destructive/15 text-destructive",
  };
  return <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${map[status] ?? map.draft}`}>{status}</span>;
}