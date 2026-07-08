import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, ShieldCheck } from "lucide-react";
import { amIAdmin, listAllProfiles, setUserApproval } from "@/lib/admin.functions";

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
  const qc = useQueryClient();

  const meQ = useQuery({ queryKey: ["am-i-admin"], queryFn: () => checkAdmin() });
  const profilesQ = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: () => list(),
    enabled: meQ.data?.admin === true,
  });

  const mut = useMutation({
    mutationFn: (v: { user_id: string; is_approved: boolean }) =>
      setApproval({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-profiles"] }),
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
              onToggle={(v) => mut.mutate({ user_id: p.id, is_approved: v })}
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
              onToggle={(v) => mut.mutate({ user_id: p.id, is_approved: v })}
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
  onToggle,
}: {
  profile: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    is_approved: boolean;
    created_at: string;
    linkedin_urn: string | null;
  };
  busy: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-4 p-4">
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
        </div>
      </div>
      {profile.is_approved ? (
        <Button variant="outline" size="sm" disabled={busy} onClick={() => onToggle(false)}>
          Deactivate
        </Button>
      ) : (
        <Button size="sm" disabled={busy} onClick={() => onToggle(true)}>
          Activate
        </Button>
      )}
    </div>
  );
}