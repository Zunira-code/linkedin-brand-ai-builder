import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  LayoutDashboard,
  Sparkles,
  Calendar,
  Flame,
  BarChart3,
  Users,
  Settings,
  Images,
  LogOut,
  Linkedin,
  CheckCircle2,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getLinkedInStatus } from "@/lib/profile.functions";
import { getMyProfile } from "@/lib/profile.functions";
import { amIAdmin } from "@/lib/admin.functions";
import { useQueryClient } from "@tanstack/react-query";
import { useTier, type Tier } from "@/lib/tier";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, minTier: "starter" as Tier },
  { to: "/generator", label: "Post generator", icon: Sparkles, minTier: "starter" as Tier },
  { to: "/calendar", label: "Calendar", icon: Calendar, minTier: "starter" as Tier },
  { to: "/inspiration", label: "Inspiration", icon: Flame, minTier: "starter" as Tier },
  { to: "/analytics", label: "Analytics", icon: BarChart3, minTier: "starter" as Tier },
  { to: "/leads", label: "Warm leads", icon: Users, minTier: "growth" as Tier },
  { to: "/carousels", label: "Carousels", icon: Images, minTier: "growth" as Tier },
  { to: "/settings", label: "Settings", icon: Settings, minTier: "starter" as Tier },
] as const;

export function AppShell({ children, title }: { children: ReactNode; title?: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const getStatus = useServerFn(getLinkedInStatus);
  const { data: status } = useQuery({ queryKey: ["linkedin-status"], queryFn: () => getStatus() });
  const getProfile = useServerFn(getMyProfile);
  const profileQ = useQuery({ queryKey: ["profile"], queryFn: () => getProfile() });
  const checkAdmin = useServerFn(amIAdmin);
  const adminQ = useQuery({ queryKey: ["am-i-admin"], queryFn: () => checkAdmin() });
  const qc = useQueryClient();
  const { has: hasTier, isLoading: tierLoading } = useTier();

  useEffect(() => {
    const uid = profileQ.data?.id;
    if (!uid) return;
    const channel = supabase
      .channel(`profile-approval-${uid}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${uid}` },
        () => qc.invalidateQueries({ queryKey: ["profile"] }),
      )
      .subscribe();
    const poll = setInterval(() => qc.invalidateQueries({ queryKey: ["profile"] }), 15000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [profileQ.data?.id, qc]);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (profileQ.data && !profileQ.data.is_approved) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
        <div className="max-w-lg rounded-2xl border border-border bg-card p-8 text-center shadow-lg">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand/10 text-brand">
            <Lock className="h-6 w-6" />
          </div>
          <h1 className="mt-5 font-display text-2xl font-semibold">Welcome to the Postpilot Beta!</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            🔒 Your account is currently under review. The creator will manually approve
            your access shortly. If you were invited, please ping them directly to unlock
            your workspace.
          </p>
          <p className="mt-4 text-xs text-muted-foreground">
            Signed in as <span className="font-medium text-foreground">{profileQ.data.display_name ?? "you"}</span>.
            This page unlocks automatically once you're approved.
          </p>
          <Button variant="ghost" size="sm" className="mt-6 gap-2" onClick={signOut}>
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-4 md:flex">
        <div className="px-2 py-2">
          <Link to="/dashboard">
            <Logo />
          </Link>
        </div>
        <nav className="mt-6 flex flex-col gap-1">
          {nav.map((item) => {
            const active = pathname.startsWith(item.to);
            const Icon = item.icon;
            const allowed = tierLoading ? true : hasTier(item.minTier);
            const target = allowed ? item.to : "/upgrade";
            return (
              <Link
                key={item.to}
                to={target}
                search={allowed ? undefined : { tier: item.minTier, feature: item.label }}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1">{item.label}</span>
                {!allowed && <Lock className="h-3 w-3 opacity-60" />}
              </Link>
            );
          })}
          {adminQ.data?.admin && (
            <Link
              to="/admin"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                pathname.startsWith("/admin")
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
              )}
            >
              <ShieldCheck className="h-4 w-4" />
              Admin
            </Link>
          )}
        </nav>
        <div className="mt-auto space-y-2">
          <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/40 p-3 text-xs">
            <div className="flex items-center gap-2 font-medium">
              <Linkedin className="h-3.5 w-3.5" />
              LinkedIn
            </div>
            <p className="mt-1 text-sidebar-foreground/70">
              {status?.connected ? (
                <span className="inline-flex items-center gap-1 text-success">
                  <CheckCircle2 className="h-3 w-3" />
                  Connected{status.name ? ` — ${status.name}` : ""}
                </span>
              ) : (
                "Not connected"
              )}
            </p>
            {!status?.connected && (
              <Link to="/settings" className="mt-2 inline-block text-brand hover:underline">
                Connect now →
              </Link>
            )}
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={signOut}>
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1">
        <header className="sticky top-0 z-10 border-b border-border/60 bg-background/80 px-6 py-4 backdrop-blur">
          <div className="flex items-center justify-between">
            <h1 className="font-display text-xl font-semibold">{title}</h1>
            <div className="text-xs text-muted-foreground">
              {status?.connected ? (
                <span className="inline-flex items-center gap-1.5 text-success">
                  <CheckCircle2 className="h-3 w-3" />
                  LinkedIn Connected via OAuth
                </span>
              ) : (
                "LinkedIn not connected"
              )}
            </div>
          </div>
        </header>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}