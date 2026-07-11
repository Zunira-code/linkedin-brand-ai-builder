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

/**
 * Post a comment on an existing LinkedIn share/ugcPost.
 * `postUrn` is the URN returned by publishTextPost/publishImagePost/publishVideoPost
 * (e.g. "urn:li:share:12345" or "urn:li:ugcPost:12345").
 */
export async function commentOnPost(
  personSub: string,
  postUrn: string,
  text: string,
) {
  const actorUrn = personSub.startsWith("urn:") ? personSub : `urn:li:person:${personSub}`;
  const encoded = encodeURIComponent(postUrn);
  const body = {
    actor: actorUrn,
    object: postUrn,
    message: { text },
  };
  const res = await fetch(`${GATEWAY}/v2/socialActions/${encoded}/comments`, {
    method: "POST",
    headers: { ...headers(), "X-Restli-Protocol-Version": "2.0.0" },
    body: JSON.stringify(body),
  });
  const raw = await res.text();
  if (!res.ok) throw new Error(`LinkedIn comment ${res.status}: ${raw}`);
  const data = raw ? JSON.parse(raw) : {};
  return (data.$URN as string) ?? (data.id as string) ?? null;
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

export async function publishVideoPost(
  personSub: string,
  text: string,
  videoBytes: Uint8Array,
  contentType = "video/mp4",
) {
  const authorUrn = personSub.startsWith("urn:") ? personSub : `urn:li:person:${personSub}`;

  // 1) Register upload for video
  const register = await fetch(`${GATEWAY}/v2/assets?action=registerUpload`, {
    method: "POST",
    headers: { ...headers(), "X-Restli-Protocol-Version": "2.0.0" },
    body: JSON.stringify({
      registerUploadRequest: {
        recipes: ["urn:li:digitalmediaRecipe:feedshare-video"],
        owner: authorUrn,
        serviceRelationships: [
          { relationshipType: "OWNER", identifier: "urn:li:userGeneratedContent" },
        ],
      },
    }),
  });
  const registerRaw = await register.text();
  if (!register.ok) throw new Error(`LinkedIn registerUpload(video) ${register.status}: ${registerRaw}`);
  const registerData = JSON.parse(registerRaw) as {
    value: {
      asset: string;
      uploadMechanism: {
        "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest": { uploadUrl: string };
      };
    };
  };
  const asset = registerData.value.asset;
  const uploadUrl =
    registerData.value.uploadMechanism["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"].uploadUrl;

  // 2) Upload the video bytes. Try via connector gateway first (auth injected),
  // fall back to direct PUT if the returned URL is pre-signed.
  const parsed = new URL(uploadUrl);
  const gatewayUploadUrl = `${GATEWAY}${parsed.pathname}${parsed.search}`;
  let uploadRes = await fetch(gatewayUploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${process.env.LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": process.env.LINKEDIN_API_KEY!,
      "Content-Type": contentType,
    },
    body: videoBytes as BodyInit,
  });
  if (!uploadRes.ok) {
    uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: videoBytes as BodyInit,
    });
  }
  if (!uploadRes.ok) {
    const t = await uploadRes.text().catch(() => "");
    throw new Error(`LinkedIn video upload ${uploadRes.status}: ${t}`);
  }

  // 3) Create UGC post referencing the video asset
  const body = {
    author: authorUrn,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text },
        shareMediaCategory: "VIDEO",
        media: [
          {
            status: "READY",
            description: { text: "" },
            media: asset,
            title: { text: "" },
          },
        ],
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
  if (!res.ok) throw new Error(`LinkedIn publish(video) ${res.status}: ${raw}`);
  const data = raw ? JSON.parse(raw) : {};
  return (data.id as string) ?? null;
}

export async function publishImagePost(
  personSub: string,
  text: string,
  imageBytes: Uint8Array,
  contentType = "image/png",
) {
  const authorUrn = personSub.startsWith("urn:") ? personSub : `urn:li:person:${personSub}`;

  // 1) Register upload
  const register = await fetch(`${GATEWAY}/v2/assets?action=registerUpload`, {
    method: "POST",
    headers: { ...headers(), "X-Restli-Protocol-Version": "2.0.0" },
    body: JSON.stringify({
      registerUploadRequest: {
        recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
        owner: authorUrn,
        serviceRelationships: [
          { relationshipType: "OWNER", identifier: "urn:li:userGeneratedContent" },
        ],
      },
    }),
  });
  const registerRaw = await register.text();
  if (!register.ok) throw new Error(`LinkedIn registerUpload ${register.status}: ${registerRaw}`);
  const registerData = JSON.parse(registerRaw) as {
    value: {
      asset: string;
      uploadMechanism: {
        "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest": { uploadUrl: string };
      };
    };
  };
  const asset = registerData.value.asset;
  const uploadUrl =
    registerData.value.uploadMechanism["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"].uploadUrl;

  // 2) Upload binary directly to the pre-signed uploadUrl LinkedIn returned.
  // This URL is host `api.linkedin.com/mediaUpload/...` and expects a PUT with
  // the OAuth bearer token. Route it via the connector gateway so it injects
  // the token; the gateway forwards the method as-is.
  const parsed = new URL(uploadUrl);
  const gatewayUploadUrl = `${GATEWAY}${parsed.pathname}${parsed.search}`;
  let uploadRes = await fetch(gatewayUploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${process.env.LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": process.env.LINKEDIN_API_KEY!,
      "Content-Type": contentType,
    },
    body: imageBytes as BodyInit,
  });
  if (!uploadRes.ok) {
    // Fallback: try uploading directly to LinkedIn's returned uploadUrl.
    // Some registerUpload URLs are pre-signed and accept the binary directly.
    uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: imageBytes as BodyInit,
    });
  }
  if (!uploadRes.ok) {
    const t = await uploadRes.text().catch(() => "");
    throw new Error(`LinkedIn image upload ${uploadRes.status}: ${t}`);
  }

  // 3) Create UGC post referencing the asset
  const body = {
    author: authorUrn,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text },
        shareMediaCategory: "IMAGE",
        media: [
          {
            status: "READY",
            description: { text: "" },
            media: asset,
            title: { text: "" },
          },
        ],
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