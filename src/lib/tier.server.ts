import type { Tier } from "./tier";
import { TIER_RANK } from "./tier";

/**
 * Server-side enforcement of subscription tier limits. Reads the caller's
 * subscription_tier from `profiles` and throws if it doesn't meet the
 * required minimum. Use inside `createServerFn` handlers so paid-plan-only
 * features can't be reached by direct RPC calls that bypass the UI.
 */
export async function requireTier(
  supabase: {
    from: (t: "profiles") => {
      select: (c: string) => {
        eq: (col: string, v: string) => {
          maybeSingle: () => Promise<{ data: { subscription_tier: Tier | null } | null; error: unknown }>;
        };
      };
    };
  },
  userId: string,
  required: Tier,
): Promise<void> {
  const { data, error } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error("Failed to verify subscription tier");
  const tier = (data?.subscription_tier ?? null) as Tier | null;
  if (!tier || TIER_RANK[tier] < TIER_RANK[required]) {
    throw new Error(`This feature requires the ${required} plan or higher.`);
  }
}