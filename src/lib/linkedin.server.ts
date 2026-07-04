const GATEWAY = "https://connector-gateway.lovable.dev/linkedin";

function headers() {
  const key = process.env.LOVABLE_API_KEY;
  const conn = process.env.LINKEDIN_API_KEY;
  if (!key || !conn) throw new Error("LinkedIn connector not configured");
  return {
    Authorization: `Bearer ${key}`,
    "X-Connection-Api-Key": conn,
    "Content-Type": "application/json",
  } as Record<string, string>;
}

export async function linkedInGet(path: string) {
  const res = await fetch(`${GATEWAY}${path}`, { headers: headers() });
  const text = await res.text();
  if (!res.ok) throw new Error(`LinkedIn ${res.status}: ${text}`);
  return text ? JSON.parse(text) : {};
}

export async function linkedInPost(path: string, body: unknown) {
  const res = await fetch(`${GATEWAY}${path}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`LinkedIn ${res.status}: ${text}`);
  return text ? JSON.parse(text) : {};
}

export async function getUserInfo() {
  return linkedInGet("/v2/userinfo") as Promise<{
    sub: string;
    name?: string;
    picture?: string;
    email?: string;
  }>;
}

export async function publishTextPost(personSub: string, text: string) {
  const authorUrn = personSub.startsWith("urn:") ? personSub : `urn:li:person:${personSub}`;
  const body = {
    author: authorUrn,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text },
        shareMediaCategory: "NONE",
      },
    },
    visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
  };
  const res = await fetch(`${GATEWAY}/v2/ugcPosts`, {
    method: "POST",
    headers: { ...headers(), "X-Restli-Protocol-Version": "2.0.0" },
    body: JSON.stringify(body),
  });
  const raw = await res.text();
  if (!res.ok) throw new Error(`LinkedIn publish ${res.status}: ${raw}`);
  const data = raw ? JSON.parse(raw) : {};
  return (data.id as string) ?? null;
}