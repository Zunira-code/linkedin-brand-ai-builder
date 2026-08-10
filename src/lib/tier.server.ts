import type { Tier } from "./tier";

/**
 * Server-side enforcement override.
 * Grants full access to all tier-protected features without querying Supabase.
 */
export async function requireTier(
  _supabase: { from: (t: string) => unknown },
  _userId: string,
  _required: Tier,
): Promise<void> {
  // Bypass all server-side tier checks completely
  return;
}
