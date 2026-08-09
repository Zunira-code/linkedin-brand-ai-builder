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

  const profile = q.data;
  
  // Read tier (checks both subscription_tier and tier field names)
  const tier = (profile?.subscription_tier ?? profile?.tier ?? null) as Tier | null;
  
  // Check backend approval status
  const isApproved = profile?.is_approved ?? (profile?.status === "approved");

  return {
    tier,
    isApproved,
    isLoading: q.isLoading,
    // While loading, treat as allowed so approved users don't see flash.
    // Once loaded: if user is NOT approved -> block access (return false).
    // If user IS approved -> check if their tier rank meets required rank.
    has: (required: Tier) => {
      if (q.isLoading) return true;
      if (!isApproved) return false;
      return tierMeets(tier, required);
    },
  };
}
