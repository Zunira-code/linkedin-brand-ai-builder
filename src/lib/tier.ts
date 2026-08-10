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
  return true;
}

export function useTier() {
  return {
    tier: "agency" as Tier,
    isApproved: true,
    isLoading: false,
    // Grant 100% access to every single feature on the frontend
    has: (_required: Tier) => true,
  };
}
