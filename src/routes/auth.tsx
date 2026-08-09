import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>): { next?: string } =>
    typeof s.next === "string" && s.next.startsWith("/") && !s.next.startsWith("//")
      ? { next: s.next }
      : {},
  head: () => ({
    meta: [
      { title: "Sign in — Postpilot" },
      { name: "description", content: "Sign in to your Postpilot workspace to manage your AI-powered LinkedIn content, calendar and analytics." },
      { property: "og:title", content: "Sign in — Postpilot" },
      { property: "og:description", content: "Sign in to your Postpilot workspace to manage your AI-powered LinkedIn content, calendar and analytics." },
      { property: "og:url", content: "https://app.mywork.co.ke/auth" },
      { name: "twitter:title", content: "Sign in — Postpilot" },
      { name: "twitter:description", content: "Sign in to your Postpilot workspace to manage your AI-powered LinkedIn content, calendar and analytics." },
    ],
    links: [{ rel: "canonical", href: "https://app.mywork.co.ke/auth" }],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const returnTo = next ?? "/dashboard";
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) window.location.replace(returnTo);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) window.location.replace(returnTo);
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate, returnTo]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + returnTo, data: { name } },
        });
        if (error) throw error;
        toast.success("Check your inbox to confirm your email.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle() {
  setBusy(true);
  try {
    // Specify the app feature page route (e.g., /dashboard, /app, or /feed)
    const redirectPath = next || "/dashboard"; 

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + redirectPath,
      },
    });

    if (error) toast.error(error.message);
  } catch (err) {
    toast.error(err instanceof Error ? err.message : String(err));
  } finally {
    setBusy(false);
  }
}

async function onLinkedIn() {
  setBusy(true);
  try {
    const redirectPath = next || "/dashboard";
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "linkedin_oidc",
      options: {
        redirectTo: window.location.origin + redirectPath,
      },
    });
    if (error) toast.error(error.message);
  } catch (err) {
    toast.error(err instanceof Error ? err.message : String(err));
  } finally {
    setBusy(false);
  }
}

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-background px-4">
      <div className="absolute inset-0 grid-pattern opacity-30" aria-hidden />
      <div className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-brand/20 blur-3xl" aria-hidden />
      <div className="relative w-full max-w-md rounded-3xl border border-border bg-card/80 p-8 backdrop-blur">
        <div className="mb-6 flex items-center justify-center">
          <Logo />
        </div>
        <h1 className="text-center font-display text-2xl font-semibold">
          {mode === "signin" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          {mode === "signin" ? "Sign in to your Postpilot workspace." : "Start writing LinkedIn posts that convert."}
        </p>

        <Button
          variant="outline"
          className="mt-6 w-full"
          onClick={onGoogle}
          disabled={busy}
          type="button"
        >
          <svg viewBox="0 0 24 24" className="mr-2 h-4 w-4">
            <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.4-1.6 4.1-5.5 4.1-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.9 1.4l3-2.9C17 2.3 14.8 1.5 12 1.5 6.2 1.5 1.5 6.2 1.5 12s4.7 10.5 10.5 10.5c6.1 0 10.2-4.3 10.2-10.3 0-.7-.1-1.2-.2-1.7H12z" />
          </svg>
          Continue with Google
        </Button>

        <Button
          variant="outline"
          className="mt-3 w-full"
          onClick={onLinkedIn}
          disabled={busy}
          type="button"
        >
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="#0A66C2">
            <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
          </svg>
          Continue with LinkedIn
        </Button>
                    <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          OR
          <div className="h-px flex-1 bg-border" />
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          {mode === "signup" && (
            <div>
              <Label htmlFor="name">Your name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex" />
            </div>
          )}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <Button type="submit" disabled={busy} className="w-full bg-brand-gradient text-brand-foreground">
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          {mode === "signin" ? "No account yet?" : "Already have an account?"}{" "}
          <button
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="text-brand hover:underline"
          >
            {mode === "signin" ? "Create one" : "Sign in"}
          </button>
        </p>
      </div>
    </main>
  );
}
