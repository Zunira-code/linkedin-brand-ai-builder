import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Users,
  Sparkles,
  RefreshCw,
  ExternalLink,
  MessageSquare,
  Loader2,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { listLeads, updateLead, syncLeadsFromLinkedIn } from "@/lib/leads.functions";

export const Route = createFileRoute("/_authenticated/leads")({
  head: () => ({ meta: [{ title: "Warm leads — Postpilot" }] }),
  component: LeadsPage,
});

type Lead = {
  id: string;
  person_urn: string;
  name: string | null;
  headline: string | null;
  profile_url: string | null;
  comment_count: number;
  last_comment_at: string | null;
  last_comment_text: string | null;
  status: string;
  note: string | null;
  created_at: string;
};

function LeadsPage() {
  const listFn = useServerFn(listLeads);
  const updateFn = useServerFn(updateLead);
  const syncFn = useServerFn(syncLeadsFromLinkedIn);
  const qc = useQueryClient();

  const leadsQ = useQuery({ queryKey: ["leads"], queryFn: () => listFn() });
  const leads = (leadsQ.data ?? []) as Lead[];

  const syncMut = useMutation({
    mutationFn: () => syncFn(),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      if (res.error && res.newComments === 0) {
        toast.error(`Sync issue: ${res.error}`);
      } else {
        toast.success(
          `Synced ${res.syncedPosts} posts — ${res.newLeads} new leads, ${res.newComments} new comments`,
        );
      }
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Sync failed"),
  });

  const stats = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
    return {
      total: leads.length,
      newThisWeek: leads.filter((l) => new Date(l.created_at).getTime() >= weekAgo).length,
      notContacted: leads.filter((l) => l.status === "not_contacted").length,
    };
  }, [leads]);

  return (
    <AppShell title="Warm leads">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-foreground">
          People who commented on your published LinkedIn posts. LinkedIn's API doesn't
          expose individual likers, so only commenters appear here.
        </p>
        <Button
          size="sm"
          onClick={() => syncMut.mutate()}
          disabled={syncMut.isPending}
          className="gap-2"
        >
          {syncMut.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Sync now
        </Button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <StatCard icon={Users} label="Total leads" value={stats.total} />
        <StatCard icon={Sparkles} label="New this week" value={stats.newThisWeek} />
        <StatCard icon={Clock} label="Not yet contacted" value={stats.notContacted} />
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="font-display text-base font-semibold">Leads</h2>
          <span className="text-xs text-muted-foreground">{leads.length} total</span>
        </div>
        {leadsQ.isLoading ? (
          <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : leads.length === 0 ? (
          <EmptyState onSync={() => syncMut.mutate()} isSyncing={syncMut.isPending} />
        ) : (
          <ul className="divide-y divide-border">
            {leads.map((lead) => (
              <LeadRow
                key={lead.id}
                lead={lead}
                onUpdate={async (patch) => {
                  await updateFn({ data: { id: lead.id, ...patch } });
                  qc.invalidateQueries({ queryKey: ["leads"] });
                }}
              />
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="mt-2 font-display text-3xl font-semibold">{value}</div>
    </div>
  );
}

function EmptyState({ onSync, isSyncing }: { onSync: () => void; isSyncing: boolean }) {
  return (
    <div className="px-6 py-14 text-center">
      <Users className="mx-auto h-8 w-8 text-muted-foreground" />
      <h3 className="mt-3 font-display text-lg font-semibold">No leads yet</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
        Once people comment on your published LinkedIn posts, they'll appear here. Click
        Sync now to pull the latest comments.
      </p>
      <Button className="mt-4 gap-2" onClick={onSync} disabled={isSyncing}>
        {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        Sync from LinkedIn
      </Button>
    </div>
  );
}

function LeadRow({
  lead,
  onUpdate,
}: {
  lead: Lead;
  onUpdate: (patch: { status?: "not_contacted" | "contacted"; note?: string | null }) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [note, setNote] = useState(lead.note ?? "");
  const [savingNote, setSavingNote] = useState(false);

  const contacted = lead.status === "contacted";
  const displayName = lead.name || "LinkedIn member";
  const lastAt = lead.last_comment_at
    ? new Date(lead.last_comment_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

  const followUpPrompt = `Draft a short, friendly LinkedIn DM to ${displayName} referencing their recent comment on my post. Their comment was: "${lead.last_comment_text ?? ""}". Keep it under 4 sentences, natural, no hard sell.`;

  return (
    <li className="px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="truncate font-medium hover:underline"
            >
              {displayName}
            </button>
            {lead.profile_url && (
              <a
                href={lead.profile_url}
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
            <Badge variant={contacted ? "default" : "secondary"} className="ml-1">
              {contacted ? (
                <>
                  <CheckCircle2 className="mr-1 h-3 w-3" /> Contacted
                </>
              ) : (
                "Not contacted"
              )}
            </Badge>
          </div>
          {lead.headline && (
            <div className="truncate text-xs text-muted-foreground">{lead.headline}</div>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MessageSquare className="h-3 w-3" /> {lead.comment_count} comment
              {lead.comment_count === 1 ? "" : "s"}
            </span>
            <span>Last engaged {lastAt}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              onUpdate({ status: contacted ? "not_contacted" : "contacted" })
            }
          >
            {contacted ? "Mark not contacted" : "Mark contacted"}
          </Button>
          <Button asChild size="sm" className="gap-1">
            <Link
              to="/generator"
              search={{ prompt: followUpPrompt }}
            >
              <Sparkles className="h-3.5 w-3.5" /> Follow up
            </Link>
          </Button>
        </div>
      </div>
      {expanded && (
        <div className="mt-3 space-y-3 rounded-lg border border-border bg-muted/30 p-3">
          {lead.last_comment_text && (
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Last comment
              </div>
              <p className="mt-1 text-sm">"{lead.last_comment_text}"</p>
            </div>
          )}
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Note
            </div>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. customer, hot lead, met at conference…"
              className="mt-1 min-h-[70px]"
            />
            <div className="mt-2 flex justify-end">
              <Button
                size="sm"
                disabled={savingNote || note === (lead.note ?? "")}
                onClick={async () => {
                  setSavingNote(true);
                  try {
                    await onUpdate({ note: note || null });
                    toast.success("Note saved");
                  } finally {
                    setSavingNote(false);
                  }
                }}
              >
                {savingNote ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save note"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </li>
  );
}