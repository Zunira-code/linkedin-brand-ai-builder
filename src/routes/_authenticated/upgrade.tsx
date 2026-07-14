import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { Check, Sparkles, Lock } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { useTier, TIER_LABEL, TIER_RANK, type Tier } from "@/lib/tier";
import { cn } from "@/lib/utils";

type Search = { tier?: Tier; feature?: string };

export const Route = createFileRoute("/_authenticated/upgrade")({
  head: () => ({ meta: [{ title: "Upgrade plan — Postpilot" }] }),
  validateSearch: (s: Record<string, unknown>): Search => ({
    tier:
      s.tier === "starter" || s.tier === "growth" || s.tier === "agency"
        ? (s.tier as Tier)
        : undefined,
    feature: typeof s.feature === "string" ? s.feature : undefined,
  }),
  component: UpgradePage,
});

const PLANS: Array<{
  tier: Tier;
  price: string;
  features: string[];
}> = [
  {
    tier: "starter",
    price: "KES 1,500 / month",
    features: ["LinkedIn post scheduling", "Content calendar", "Basic analytics"],
  },
  {
    tier: "growth",
    price: "KES 3,500 / month",
    features: [
      "Everything in Starter",
      "Repurpose content",
      "Video publishing",
      "Carousel builder",
      "Warm leads",
      "Full analytics",
    ],
  },
  {
    tier: "agency",
    price: "KES 12,000 / month",
    features: ["Everything in Growth", "Multiple LinkedIn profiles", "Priority support"],
  },
];

function UpgradePage() {
  const search = useSearch({ from: "/_authenticated/upgrade" });
  const { tier: currentTier } = useTier();
  const highlight = search.tier ?? "growth";

  return (
    <AppShell title="Upgrade plan">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-brand">
            <Lock className="h-5 w-5" />
          </div>
          <h2 className="mt-4 font-display text-2xl font-semibold">
            {search.feature
              ? `Unlock ${search.feature} with the ${TIER_LABEL[highlight]} plan`
              : `Upgrade to ${TIER_LABEL[highlight]}`}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Your current plan:{" "}
            <span className="font-medium text-foreground">
              {currentTier ? TIER_LABEL[currentTier] : "None"}
            </span>
            . Payments via M-Pesa STK push coming soon — contact support to upgrade now.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          {PLANS.map((p) => {
            const isCurrent = currentTier === p.tier;
            const isTarget = highlight === p.tier;
            const isDowngrade =
              currentTier && TIER_RANK[currentTier] > TIER_RANK[p.tier];
            return (
              <div
                key={p.tier}
                className={cn(
                  "rounded-2xl border bg-card p-6",
                  isTarget ? "border-brand shadow-lg ring-1 ring-brand/40" : "border-border",
                )}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-lg font-semibold">{TIER_LABEL[p.tier]}</h3>
                  {isTarget && (
                    <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-medium text-brand">
                      Recommended
                    </span>
                  )}
                  {isCurrent && (
                    <span className="rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
                      Current
                    </span>
                  )}
                </div>
                <div className="mt-2 text-sm text-muted-foreground">{p.price}</div>
                <ul className="mt-4 space-y-2 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className={cn(
                    "mt-6 w-full",
                    isTarget && "bg-brand-gradient text-brand-foreground",
                  )}
                  variant={isTarget ? "default" : "outline"}
                  disabled={isCurrent || Boolean(isDowngrade)}
                  asChild={!isCurrent && !isDowngrade}
                >
                  {isCurrent ? (
                    <span>Current plan</span>
                  ) : isDowngrade ? (
                    <span>Contact support</span>
                  ) : (
                    <a href="mailto:linkedin@mywork.co.ke?subject=Upgrade%20plan">
                      <Sparkles className="mr-2 h-4 w-4" /> Upgrade
                    </a>
                  )}
                </Button>
              </div>
            );
          })}
        </div>

        <div className="text-center text-sm text-muted-foreground">
          <Link to="/dashboard" className="text-brand hover:underline">
            ← Back to dashboard
          </Link>
        </div>
      </div>
    </AppShell>
  );
}