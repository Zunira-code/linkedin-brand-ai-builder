import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Users,
  Sparkles,
  ExternalLink,
  MessageSquare,
  Loader2,
  CheckCircle2,
  Clock,
  Plus,
  Info,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { listLeads, updateLead, addLead } from "@/lib/leads.functions";

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
  const addFn = useServerFn(addLead);
  const qc = useQueryClient();

  const leadsQ = useQuery({ queryKey: ["leads"], queryFn: () => listFn() });
  const leads = (leadsQ.data ?? []) as Lead[];

  const [addOpen, setAddOpen] = useState(false);

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
          Track people engaging with your LinkedIn posts. Add them as you spot
          comments on LinkedIn — auto-sync isn't available (see below).
        </p>
        <AddLeadDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          onSave={async (values) => {
            await addFn({ data: values });
            await qc.invalidateQueries({ queryKey: ["leads"] });
          }}
        />
      </div>

      <div className="mt-4 flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-4 text-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="text-muted-foreground">
          <span className="font-medium text-foreground">Why no auto-sync?</span>{" "}
          LinkedIn only returns comments on your posts to apps approved for their
          Marketing Developer Platform (the <code>r_member_social</code> scope),
          which isn't available through the standard connector. When you see a
          comment on LinkedIn, click <span className="font-medium">Add lead</span>{" "}
          to track that person here.
        </div>
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
          <EmptyState onAdd={() => setAddOpen(true)} />
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

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="px-6 py-14 text-center">
      <Users className="mx-auto h-8 w-8 text-muted-foreground" />
      <h3 className="mt-3 font-display text-lg font-semibold">No leads yet</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
        When someone comments on one of your LinkedIn posts, add them here to
        track follow-ups and draft a reply.
      </p>
      <Button className="mt-4 gap-2" onClick={onAdd}>
        <Plus className="h-4 w-4" /> Add lead
      </Button>
    </div>
  );
}

function AddLeadDialog({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (v: {
    name: string;
    headline?: string | null;
    profile_url?: string | null;
    last_comment_text?: string | null;
    note?: string | null;
  }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [headline, setHeadline] = useState("");
  const [profileUrl, setProfileUrl] = useState("");
  const [comment, setComment] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName("");
    setHeadline("");
    setProfileUrl("");
    setComment("");
    setNote("");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" /> Add lead
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a lead</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="lead-name">Name</Label>
            <Input
              id="lead-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
            />
          </div>
          <div>
            <Label htmlFor="lead-headline">Headline (optional)</Label>
            <Input
              id="lead-headline"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="Head of Growth at Acme"
            />
          </div>
          <div>
            <Label htmlFor="lead-url">LinkedIn URL (optional)</Label>
            <Input
              id="lead-url"
              value={profileUrl}
              onChange={(e) => setProfileUrl(e.target.value)}
              placeholder="https://www.linkedin.com/in/…"
            />
          </div>
          <div>
            <Label htmlFor="lead-comment">Their comment (optional)</Label>
            <Textarea
              id="lead-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Paste the comment they left on your post"
              className="min-h-[80px]"
            />
          </div>
          <div>
            <Label htmlFor="lead-note">Note (optional)</Label>
            <Textarea
              id="lead-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. warm intro, met at conference…"
              className="min-h-[60px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            disabled={!name.trim() || saving}
            onClick={async () => {
              setSaving(true);
              try {
                await onSave({
                  name: name.trim(),
                  headline: headline.trim() || null,
                  profile_url: profileUrl.trim() || null,
                  last_comment_text: comment.trim() || null,
                  note: note.trim() || null,
                });
                toast.success("Lead added");
                onOpenChange(false);
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Failed to add lead");
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add lead"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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