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
  const [backendDown, setBackendDown] = useState(false);
  const [retrying, setRetrying] = useState(false);

  function isNetworkError(err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return /failed to fetch|networkerror|load failed|fetch failed|network request failed|err_connection|timeout/i.test(
      msg,
    );
  }

  function handleAuthError(err: unknown) {
    if (isNetworkError(err)) {
      setBackendDown(true);
      toast.error("Can't reach the authentication service — it looks paused or offline.");
    } else {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  async function retryConnection() {
    setRetrying(true);
    try {
      const { error } = await supabase.auth.getSession();
      if (error) throw error;
      setBackendDown(false);
      toast.success("Connection restored — you can sign in now.");
    } catch (err) {
      if (isNetworkError(err)) {
        toast.error("Still can't reach the authentication service. Try again in a moment.");
      } else {
        setBackendDown(false);
      }
    } finally {
      setRetrying(false);
    }
  }

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (data.session) window.location.replace(returnTo);
      })
      .catch((err) => {
        if (isNetworkError(err)) setBackendDown(true);
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
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + returnTo, data: { name } },
        });
        if (error) throw error;
        if (data.session) {
          toast.success("Account created — you're signed in.");
        } else {
          const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
          if (signInError) throw signInError;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      setBackendDown(false);
    } catch (err) {
      handleAuthError(err);
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle() {
  setBusy(true);
  try {
    // Remember where to land; OAuth must return to a public same-origin URL.
    sessionStorage.setItem("postpilot:next", returnTo);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/auth",
    });
    if (result.error) {
      toast.error(result.error.message ?? "Google sign-in failed.");
      return;
    }
    if (result.redirected) return;
    window.location.replace(returnTo);
  } catch (err) {
    handleAuthError(err);
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

        {backendDown && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm"
          >
            <p className="font-medium text-destructive">Authentication service unreachable</p>
            <p className="mt-1 text-muted-foreground">
              The backend appears to be paused or offline, so sign-in can't be completed right now.
              Your details are fine — this is a temporary connection problem.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={retryConnection}
              disabled={retrying}
            >
              {retrying ? "Retrying…" : "Retry connection"}
            </Button>
          </div>
        )}

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
