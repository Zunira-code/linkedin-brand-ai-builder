import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyProfile } from "@/lib/profile.functions";

export type Tier = "starter" | "growth" | "agency";

export const TIER_RANK: Record<Tier, number> = {
  starter: 1,
  growth: 2,
  agency: 3,
};

export const TIER_LABEL: Record<Tier, string> = {
  starter: "Starter",
  growth: "Growth",
  agency: "Agency",
};

export function tierMeets(current: Tier | null | undefined, required: Tier): boolean {
  if (!current) return false;
  return TIER_RANK[current] >= TIER_RANK[required];
}

export function useTier() {
  const getProfile = useServerFn(getMyProfile);
  const q = useQuery({ queryKey: ["profile"], queryFn: () => getProfile() });
  const tier = (q.data?.subscription_tier ?? null) as Tier | null;
  return {
    tier,
    isLoading: q.isLoading,
    // While the profile is still loading, treat gated features as allowed so
    // paying users don't briefly see lock icons / upgrade paywalls flashing.
    has: (required: Tier) => (q.isLoading ? true : tierMeets(tier, required)),
  };
}