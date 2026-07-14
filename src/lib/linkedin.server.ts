const LINKEDIN_API = "https://api.linkedin.com";

function authHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
}

export async function linkedInGet(accessToken: string, path: string) {
  const res = await fetch(`${LINKEDIN_API}${path}`, { headers: authHeaders(accessToken) });
  const text = await res.text();
  if (!res.ok) throw new Error(`LinkedIn ${res.status}: ${text}`);
  return text ? JSON.parse(text) : {};
}

export async function linkedInPost(accessToken: string, path: string, body: unknown) {
  const res = await fetch(`${LINKEDIN_API}${path}`, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`LinkedIn ${res.status}: ${text}`);
  return text ? JSON.parse(text) : {};
}

export async function getUserInfo(accessToken: string) {
  return linkedInGet(accessToken, "/v2/userinfo") as Promise<{
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
  accessToken: string,
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
  const res = await fetch(`${LINKEDIN_API}/v2/socialActions/${encoded}/comments`, {
    method: "POST",
    headers: { ...authHeaders(accessToken), "X-Restli-Protocol-Version": "2.0.0" },
    body: JSON.stringify(body),
  });
  const raw = await res.text();
  if (!res.ok) throw new Error(`LinkedIn comment ${res.status}: ${raw}`);
  const data = raw ? JSON.parse(raw) : {};
  return (data.$URN as string) ?? (data.id as string) ?? null;
}

/**
 * Fetch comments on a specific LinkedIn share/ugcPost URN.
 * Returns raw comment elements from the socialActions API.
 */
export async function getPostComments(accessToken: string, postUrn: string) {
  const encoded = encodeURIComponent(postUrn);
  const res = await fetch(
    `${LINKEDIN_API}/v2/socialActions/${encoded}/comments?count=100`,
    { headers: { ...authHeaders(accessToken), "X-Restli-Protocol-Version": "2.0.0" } },
  );
  const raw = await res.text();
  if (!res.ok) throw new Error(`LinkedIn getComments ${res.status}: ${raw}`);
  const data = raw ? JSON.parse(raw) : {};
  return (data.elements ?? []) as Array<{
    actor?: string;
    created?: { time?: number };
    message?: { text?: string };
    $URN?: string;
    id?: string;
  }>;
}

/**
 * Best-effort profile lookup for a LinkedIn person URN. Most member profile
 * endpoints require Marketing Developer Platform scopes, so this may fail
 * silently — callers should fall back to a placeholder name/headline.
 */
export async function getPersonProfile(accessToken: string, personUrn: string): Promise<{
  name?: string;
  headline?: string;
  profileUrl?: string;
  avatarUrl?: string;
} | null> {
  const id = personUrn.replace(/^urn:li:person:/, "");
  try {
    const res = await fetch(
      `${LINKEDIN_API}/v2/people/(id:${encodeURIComponent(id)})?projection=(id,localizedFirstName,localizedLastName,localizedHeadline,vanityName)`,
      { headers: { ...authHeaders(accessToken), "X-Restli-Protocol-Version": "2.0.0" } },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      localizedFirstName?: string;
      localizedLastName?: string;
      localizedHeadline?: string;
      vanityName?: string;
    };
    const name =
      [data.localizedFirstName, data.localizedLastName].filter(Boolean).join(" ") ||
      undefined;
    return {
      name,
      headline: data.localizedHeadline,
      profileUrl: data.vanityName ? `https://www.linkedin.com/in/${data.vanityName}` : undefined,
    };
  } catch {
    return null;
  }
}

export async function publishTextPost(accessToken: string, personSub: string, text: string) {
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
  const res = await fetch(`${LINKEDIN_API}/v2/ugcPosts`, {
    method: "POST",
    headers: { ...authHeaders(accessToken), "X-Restli-Protocol-Version": "2.0.0" },
    body: JSON.stringify(body),
  });
  const raw = await res.text();
  if (!res.ok) throw new Error(`LinkedIn publish ${res.status}: ${raw}`);
  const data = raw ? JSON.parse(raw) : {};
  return (data.id as string) ?? null;
}

export async function publishVideoPost(
  accessToken: string,
  personSub: string,
  text: string,
  videoBytes: Uint8Array,
  contentType = "video/mp4",
) {
  const authorUrn = personSub.startsWith("urn:") ? personSub : `urn:li:person:${personSub}`;

  // 1) Register upload for video
  const register = await fetch(`${LINKEDIN_API}/v2/assets?action=registerUpload`, {
    method: "POST",
    headers: { ...authHeaders(accessToken), "X-Restli-Protocol-Version": "2.0.0" },
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

  // 2) Upload the video bytes directly to LinkedIn's returned upload URL.
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": contentType,
    },
    body: videoBytes as BodyInit,
  });
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
  const res = await fetch(`${LINKEDIN_API}/v2/ugcPosts`, {
    method: "POST",
    headers: { ...authHeaders(accessToken), "X-Restli-Protocol-Version": "2.0.0" },
    body: JSON.stringify(body),
  });
  const raw = await res.text();
  if (!res.ok) throw new Error(`LinkedIn publish(video) ${res.status}: ${raw}`);
  const data = raw ? JSON.parse(raw) : {};
  return (data.id as string) ?? null;
}

export async function publishImagePost(
  accessToken: string,
  personSub: string,
  text: string,
  imageBytes: Uint8Array,
  contentType = "image/png",
) {
  const authorUrn = personSub.startsWith("urn:") ? personSub : `urn:li:person:${personSub}`;

  // 1) Register upload
  const register = await fetch(`${LINKEDIN_API}/v2/assets?action=registerUpload`, {
    method: "POST",
    headers: { ...authHeaders(accessToken), "X-Restli-Protocol-Version": "2.0.0" },
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
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": contentType,
    },
    body: imageBytes as BodyInit,
  });
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
  const res = await fetch(`${LINKEDIN_API}/v2/ugcPosts`, {
    method: "POST",
    headers: { ...authHeaders(accessToken), "X-Restli-Protocol-Version": "2.0.0" },
    body: JSON.stringify(body),
  });
  const raw = await res.text();
  if (!res.ok) throw new Error(`LinkedIn publish ${res.status}: ${raw}`);
  const data = raw ? JSON.parse(raw) : {};
  return (data.id as string) ?? null;
}

/**
 * Register + upload a single image asset and return its LinkedIn asset URN.
 * Extracted so multi-image (carousel) posts can register all images before
 * creating one ugcPost that references every asset.
 */
async function registerAndUploadImage(
  accessToken: string,
  authorUrn: string,
  imageBytes: Uint8Array,
  contentType: string,
): Promise<string> {
  const register = await fetch(`${LINKEDIN_API}/v2/assets?action=registerUpload`, {
    method: "POST",
    headers: { ...authHeaders(accessToken), "X-Restli-Protocol-Version": "2.0.0" },
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
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": contentType,
    },
    body: imageBytes as BodyInit,
  });
  if (!uploadRes.ok) {
    const t = await uploadRes.text().catch(() => "");
    throw new Error(`LinkedIn image upload ${uploadRes.status}: ${t}`);
  }
  return asset;
}

/**
 * Publish a carousel-style multi-image post. Each slide is uploaded as its own
 * image asset and referenced from a single ugcPost. Viewers swipe through the
 * slides in-feed.
 */
export async function publishMultiImagePost(
  accessToken: string,
  personSub: string,
  text: string,
  images: Array<{ bytes: Uint8Array; contentType: string }>,
) {
  if (images.length === 0) throw new Error("No slides to publish");
  const authorUrn = personSub.startsWith("urn:") ? personSub : `urn:li:person:${personSub}`;
  const assets: string[] = [];
  for (const img of images) {
    assets.push(await registerAndUploadImage(accessToken, authorUrn, img.bytes, img.contentType));
  }
  const body = {
    author: authorUrn,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text },
        shareMediaCategory: "IMAGE",
        media: assets.map((asset) => ({
          status: "READY",
          description: { text: "" },
          media: asset,
          title: { text: "" },
        })),
      },
    },
    visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
  };
  const res = await fetch(`${LINKEDIN_API}/v2/ugcPosts`, {
    method: "POST",
    headers: { ...authHeaders(accessToken), "X-Restli-Protocol-Version": "2.0.0" },
    body: JSON.stringify(body),
  });
  const raw = await res.text();
  if (!res.ok) throw new Error(`LinkedIn publish(carousel) ${res.status}: ${raw}`);
  const data = raw ? JSON.parse(raw) : {};
  return (data.id as string) ?? null;
}