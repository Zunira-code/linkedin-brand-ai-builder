import { createHmac, timingSafeEqual } from "node:crypto";

const LINKEDIN_AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization";
const LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";

export const LINKEDIN_SCOPES = "openid profile email w_member_social";

function stateSecret(): string {
  const s = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.CRON_SECRET;
  if (!s) throw new Error("Missing server secret for OAuth state signing");
  return s;
}

export function signState(payload: { userId: string; origin: string; nonce: string }): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", stateSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyState(state: string): { userId: string; origin: string; nonce: string } | null {
  const [body, sig] = state.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", stateSecret()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

export function buildAuthorizeUrl(opts: { redirectUri: string; state: string }): string {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  if (!clientId) throw new Error("LINKEDIN_CLIENT_ID is not set");
  const u = new URL(LINKEDIN_AUTH_URL);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("client_id", clientId);
  u.searchParams.set("redirect_uri", opts.redirectUri);
  u.searchParams.set("state", opts.state);
  u.searchParams.set("scope", LINKEDIN_SCOPES);
  return u.toString();
}

export interface LinkedInTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  scope?: string;
  token_type?: string;
}

export async function exchangeCodeForToken(code: string, redirectUri: string): Promise<LinkedInTokenResponse> {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("LinkedIn client credentials not configured");
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });
  const res = await fetch(LINKEDIN_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`LinkedIn token exchange ${res.status}: ${text}`);
  return JSON.parse(text);
}

export async function refreshAccessToken(refreshToken: string): Promise<LinkedInTokenResponse> {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("LinkedIn client credentials not configured");
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });
  const res = await fetch(LINKEDIN_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`LinkedIn token refresh ${res.status}: ${text}`);
  return JSON.parse(text);
}

/**
 * Load a valid LinkedIn access token + person URN for a user. Uses the
 * service-role client so it works from both authenticated server fns and the
 * public cron route. Refreshes the token when it's within 60s of expiry.
 */
export async function getLinkedInAuthForUser(
  userId: string,
): Promise<{ accessToken: string; urn: string } | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("linkedin_connections")
    .select("access_token, refresh_token, token_expires_at, linkedin_profile_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data?.access_token || !data.linkedin_profile_id) return null;

  const expiresAt = data.token_expires_at ? new Date(data.token_expires_at).getTime() : 0;
  const soon = Date.now() + 60_000;
  if (expiresAt && expiresAt < soon && data.refresh_token) {
    try {
      const refreshed = await refreshAccessToken(data.refresh_token);
      const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
      await supabaseAdmin
        .from("linkedin_connections")
        .update({
          access_token: refreshed.access_token,
          refresh_token: refreshed.refresh_token ?? data.refresh_token,
          token_expires_at: newExpiry,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
      return { accessToken: refreshed.access_token, urn: data.linkedin_profile_id };
    } catch {
      // fall through to using the (possibly expired) access token
    }
  }
  return { accessToken: data.access_token, urn: data.linkedin_profile_id };
}