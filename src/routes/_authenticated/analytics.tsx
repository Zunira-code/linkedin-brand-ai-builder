import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BarChart3, Users, FileText, CheckCircle2, Linkedin } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { getAnalytics } from "@/lib/analytics.functions";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Postpilot" }] }),
  component: Analytics,
});

function Analytics() {
  const fn = useServerFn(getAnalytics);
  const q = useQuery({ queryKey: ["analytics"], queryFn: () => fn() });
  const data = q.data;

  return (
    <AppShell title="Analytics">
      {!data?.profile?.linkedin_urn && (
        <div className="mb-4 rounded-2xl border border-brand/40 bg-brand/10 p-4 text-sm">
          <div className="flex items-center gap-2 font-medium text-brand">
            <Linkedin className="h-4 w-4" /> Connect LinkedIn to see live profile data
          </div>
          <p className="mt-1 text-muted-foreground">
            Head to Settings → Connect LinkedIn. Until then, we show your local activity.
          </p>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-4">
        <Stat icon={Users} label="LinkedIn identity" value={data?.linkedInProfile?.name ?? "—"} sub={data?.linkedInProfile?.email ?? "not connected"} />
        <Stat icon={FileText} label="Drafts" value={String(data?.counts.drafts ?? 0)} />
        <Stat icon={BarChart3} label="Scheduled" value={String(data?.counts.scheduled ?? 0)} />
        <Stat icon={CheckCircle2} label="Posted" value={String(data?.counts.posted ?? 0)} />
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display text-lg font-semibold">Posts published (last 8 weeks)</h2>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data?.weeks ?? []}>
              <XAxis dataKey="week" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }}
                cursor={{ fill: "var(--accent)", opacity: 0.4 }}
              />
              <Bar dataKey="count" fill="var(--brand)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {data?.linkedInError && (
        <p className="mt-4 text-xs text-destructive">LinkedIn API error: {data.linkedInError}</p>
      )}
    </AppShell>
  );
}

function Stat({ icon: Icon, label, value, sub }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-brand" />
      </div>
      <div className="mt-2 font-display text-2xl font-semibold truncate">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}