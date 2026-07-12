import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, Clock, Loader2, Mail, ShieldCheck } from "lucide-react";
import { amIAdmin, listAllProfiles, setUserApproval, inviteUser } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
  errorComponent: ({ error }) => (
    <AppShell title="Admin">
      <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
        {error.message}
      </div>
    </AppShell>
  ),
});

function AdminPage() {
  const checkAdmin = useServerFn(amIAdmin);
  const list = useServerFn(listAllProfiles);
  const setApproval = useServerFn(setUserApproval);
  const invite = useServerFn(inviteUser);
  const qc = useQueryClient();

  const meQ = useQuery({ queryKey: ["am-i-admin"], queryFn: () => checkAdmin() });
  const profilesQ = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: () => list(),
    enabled: meQ.data?.admin === true,
  });

  const mut = useMutation({
    mutationFn: (v: { user_id: string; is_approved: boolean; subscription_tier?: "starter" | "growth" | "agency" }) =>
      setApproval({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-profiles"] }),
  });

  const [inviteEmail, setInviteEmail] = useState("");
  const inviteMut = useMutation({
    mutationFn: (email: string) => invite({ data: { email } }),
    onSuccess: (r) => {
      toast.success(`Invite sent to ${r.email}`);
      setInviteEmail("");
      qc.invalidateQueries({ queryKey: ["admin-profiles"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
  });

  if (meQ.isLoading) {
    return <AppShell title="Admin"><div className="text-sm text-muted-foreground">Loading…</div></AppShell>;
  }
  if (!meQ.data?.admin) {
    throw redirect({ to: "/dashboard" });
  }

  const profiles = profilesQ.data ?? [];
  const pending = profiles.filter((p) => !p.is_approved);
  const approved = profiles.filter((p) => p.is_approved);

  return (
    <AppShell title="Admin">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-brand">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold">User approvals</h2>
            <p className="text-sm text-muted-foreground">
              Approve beta users to unlock their workspace instantly.
            </p>
          </div>
        </header>

        <section className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium">
            <Mail className="h-4 w-4 text-brand" />
            Invite a user by email
          </div>
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!inviteEmail.trim()) return;
              inviteMut.mutate(inviteEmail.trim());
            }}
          >
            <Input
              type="email"
              required
              placeholder="name@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="max-w-xs"
            />
            <Button type="submit" disabled={inviteMut.isPending || !inviteEmail.trim()}>
              {inviteMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
              Send invite
            </Button>
          </form>
          <p className="mt-2 text-xs text-muted-foreground">
            Sends a magic sign-in link and pre-approves the account so they land straight in the workspace.
          </p>
        </section>

        <Section
          title="Pending"
          icon={<Clock className="h-4 w-4 text-warning" />}
          count={pending.length}
          empty="No one is waiting. 🎉"
        >
          {pending.map((p) => (
            <Row
              key={p.id}
              profile={p}
              busy={mut.isPending && mut.variables?.user_id === p.id}
              onActivate={(tier) => mut.mutate({ user_id: p.id, is_approved: true, subscription_tier: tier })}
              onDeactivate={() => mut.mutate({ user_id: p.id, is_approved: false })}
            />
          ))}
        </Section>

        <Section
          title="Approved"
          icon={<CheckCircle2 className="h-4 w-4 text-success" />}
          count={approved.length}
          empty="No approved users yet."
        >
          {approved.map((p) => (
            <Row
              key={p.id}
              profile={p}
              busy={mut.isPending && mut.variables?.user_id === p.id}
              onActivate={(tier) => mut.mutate({ user_id: p.id, is_approved: true, subscription_tier: tier })}
              onDeactivate={() => mut.mutate({ user_id: p.id, is_approved: false })}
            />
          ))}
        </Section>
      </div>
    </AppShell>
  );
}

function Section({
  title,
  icon,
  count,
  empty,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  empty: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2 text-sm font-medium">
        {icon}
        {title}
        <span className="text-muted-foreground">({count})</span>
      </div>
      <div className="divide-y divide-border rounded-xl border border-border bg-card">
        {count === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">{empty}</div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

function Row({
  profile,
  busy,
  onActivate,
  onDeactivate,
}: {
  profile: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    is_approved: boolean;
    created_at: string;
    linkedin_urn: string | null;
    subscription_tier?: "starter" | "growth" | "agency" | null;
  };
  busy: boolean;
  onActivate: (tier: "starter" | "growth" | "agency") => void;
  onDeactivate: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4 p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-sm font-medium">
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
        ) : (
          (profile.display_name ?? "?").slice(0, 1).toUpperCase()
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">
          {profile.display_name ?? "Unnamed user"}
        </div>
        <div className="truncate text-xs text-muted-foreground">
          Joined {new Date(profile.created_at).toLocaleDateString()}
          {profile.linkedin_urn ? " · LinkedIn connected" : ""}
          {profile.is_approved && profile.subscription_tier
            ? ` · Tier: ${profile.subscription_tier}`
            : ""}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={profile.is_approved && profile.subscription_tier === "starter" ? "default" : "outline"}
          disabled={busy}
          onClick={() => onActivate("starter")}
        >
          {profile.is_approved ? "Set Starter" : "Activate: Starter"}
        </Button>
        <Button
          size="sm"
          variant={profile.is_approved && profile.subscription_tier === "growth" ? "default" : "outline"}
          disabled={busy}
          onClick={() => onActivate("growth")}
        >
          {profile.is_approved ? "Set Growth" : "Activate: Growth"}
        </Button>
        <Button
          size="sm"
          variant={profile.is_approved && profile.subscription_tier === "agency" ? "default" : "outline"}
          disabled={busy}
          onClick={() => onActivate("agency")}
        >
          {profile.is_approved ? "Set Agency" : "Activate: Agency"}
        </Button>
        {profile.is_approved && (
          <Button variant="ghost" size="sm" disabled={busy} onClick={onDeactivate}>
            Deactivate
          </Button>
        )}
      </div>
    </div>
  );
}