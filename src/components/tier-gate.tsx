import { Link } from "@tanstack/react-router";
import { Lock, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useTier, TIER_LABEL, type Tier } from "@/lib/tier";

export function UpgradePaywall({
  requiredTier,
  feature,
  compact,
}: {
  requiredTier: Tier;
  feature?: string;
  compact?: boolean;
}) {
  const label = TIER_LABEL[requiredTier];
  return (
    <div
      className={
        compact
          ? "rounded-xl border border-dashed border-border bg-card/60 p-6 text-center"
          : "mx-auto max-w-xl rounded-2xl border border-border bg-card p-8 text-center shadow-lg"
      }
    >
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-brand">
        <Lock className="h-5 w-5" />
      </div>
      <h2 className="mt-4 font-display text-lg font-semibold">
        {feature ?? "This feature"} requires the {label} plan
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Upgrade your subscription to unlock {feature ?? "this feature"} and more.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Button asChild className="bg-brand-gradient text-brand-foreground">
          <Link to="/upgrade" search={{ tier: requiredTier, feature }}>
            <Sparkles className="mr-2 h-4 w-4" /> Upgrade to {label}
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/pricing">View plans</Link>
        </Button>
      </div>
    </div>
  );
}

export function RequireTier({
  tier,
  feature,
  children,
  fallback,
}: {
  tier: Tier;
  feature?: string;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { has, isLoading } = useTier();
  if (isLoading) return null;
  if (has(tier)) return <>{children}</>;
  if (fallback !== undefined) return <>{fallback}</>;
  return <UpgradePaywall requiredTier={tier} feature={feature} />;
}