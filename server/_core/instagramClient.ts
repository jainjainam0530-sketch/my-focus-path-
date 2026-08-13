import { INSTAGRAM_CONFIG, assertInstagramConfig } from "./instagramConfig";

export type InstagramContentType = "IMAGE" | "REEL" | "STORY" | "CAROUSEL";

type TokenResponse = {
  access_token?: string;
  expires_in?: number;
  data?: Array<{ access_token?: string; user_id?: string; permissions?: string }>;
  user_id?: string;
};

type InstagramErrorPayload = {
  error?: { message?: string; type?: string; code?: number; error_subcode?: number };
  error_message?: string;
  error_type?: string;
  code?: number;
};

export class InstagramApiError extends Error {
  readonly status: number;
  readonly retriable: boolean;

  constructor(message: string, status: number, retriable = false) {
    super(message);
    this.name = "InstagramApiError";
    this.status = status;
    this.retriable = retriable;
  }
}

function graphUrl(path: string) {
  return `https://graph.instagram.com/${INSTAGRAM_CONFIG.graphVersion}/${path.replace(/^\//, "")}`;
}

function toForm(params: Record<string, string | number | boolean | undefined>) {
  const form = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") form.set(key, String(value));
  }
  return form;
}

function errorMessage(body: unknown, fallback: string) {
  const payload = body as InstagramErrorPayload;
  return payload?.error?.message || payload?.error_message || fallback;
}

async function parseResponse<T>(response: Response, fallback: string): Promise<T> {
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // Meta can respond without JSON on upstream failures.
  }

  if (!response.ok) {
    const status = response.status;
    throw new InstagramApiError(errorMessage(body, fallback), status, status === 429 || status >= 500);
  }

  return body as T;
}

async function graphRequest<T>(
  path: string,
  accessToken: string,
  method: "GET" | "POST" = "GET",
  params: Record<string, string | number | boolean | undefined> = {},
): Promise<T> {
  const form = toForm({ ...params, access_token: accessToken });
  const url = method === "GET" ? `${graphUrl(path)}?${form.toString()}` : graphUrl(path);
  const response = await fetch(url, {
    method,
    headers: method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : undefined,
    body: method === "POST" ? form : undefined,
  });
  return parseResponse<T>(response, "Instagram did not accept this request.");
}

export function buildInstagramAuthorizationUrl(state: string) {
  assertInstagramConfig();
  const parameters = new URLSearchParams({
    client_id: INSTAGRAM_CONFIG.appId,
    redirect_uri: INSTAGRAM_CONFIG.redirectUri,
    response_type: "code",
    scope: "instagram_business_basic,instagram_business_content_publish",
    state,
  });
  return `https://www.instagram.com/oauth/authorize?${parameters.toString()}`;
}

export async function exchangeInstagramAuthorizationCode(code: string) {
  assertInstagramConfig();
  const response = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    body: toForm({
      client_id: INSTAGRAM_CONFIG.appId,
      client_secret: INSTAGRAM_CONFIG.appSecret,
      grant_type: "authorization_code",
      redirect_uri: INSTAGRAM_CONFIG.redirectUri,
      code: code.replace(/#_$/, ""),
    }),
  });
  const payload = await parseResponse<TokenResponse>(response, "Instagram could not exchange the authorization code.");
  const tokenData = payload.data?.[0] ?? payload;

  if (!tokenData.access_token || !tokenData.user_id) {
    throw new InstagramApiError("Instagram returned an incomplete authorization response.", 502, false);
  }

  return { accessToken: tokenData.access_token, instagramUserId: String(tokenData.user_id) };
}

export async function exchangeForLongLivedInstagramToken(shortLivedToken: string) {
  assertInstagramConfig();
  const parameters = toForm({
    grant_type: "ig_exchange_token",
    client_secret: INSTAGRAM_CONFIG.appSecret,
    access_token: shortLivedToken,
  });
  const response = await fetch(`https://graph.instagram.com/access_token?${parameters.toString()}`);
  const payload = await parseResponse<TokenResponse>(response, "Instagram could not create a long-lived connection.");

  if (!payload.access_token || !payload.expires_in) {
    throw new InstagramApiError("Instagram returned an incomplete long-lived token response.", 502, false);
  }

  return { accessToken: payload.access_token, expiresInSeconds: payload.expires_in };
}

export async function refreshLongLivedInstagramToken(longLivedToken: string) {
  const parameters = toForm({ grant_type: "ig_refresh_token", access_token: longLivedToken });
  const response = await fetch(`https://graph.instagram.com/refresh_access_token?${parameters.toString()}`);
  const payload = await parseResponse<TokenResponse>(response, "Instagram could not refresh the connection.");

  if (!payload.access_token || !payload.expires_in) {
    throw new InstagramApiError("Instagram returned an incomplete refreshed token response.", 502, false);
  }

  return { accessToken: payload.access_token, expiresInSeconds: payload.expires_in };
}

export async function getInstagramProfile(instagramUserId: string, accessToken: string) {
  return graphRequest<{ id: string; username?: string; profile_picture_url?: string }>(
    `${instagramUserId}`,
    accessToken,
    "GET",
    { fields: "id,username,profile_picture_url" },
  );
}

export async function getContentPublishingLimit(instagramUserId: string, accessToken: string) {
  return graphRequest<{ data?: Array<{ quota_usage?: number; config?: { quota_total?: number } }> }>(
    `${instagramUserId}/content_publishing_limit`,
    accessToken,
    "GET",
    { fields: "quota_usage,config" },
  );
}

function isVideoUrl(value: string) {
  const pathname = new URL(value).pathname.toLowerCase();
  return [".mp4", ".mov", ".m4v", ".webm"].some((extension) => pathname.endsWith(extension));
}

async function createContainer(
  instagramUserId: string,
  accessToken: string,
  params: Record<string, string | number | boolean | undefined>,
) {
  const response = await graphRequest<{ id?: string }>(`${instagramUserId}/media`, accessToken, "POST", params);
  if (!response.id) {
    throw new InstagramApiError("Instagram did not return a media container.", 502, false);
  }
  return response.id;
}

export async function createInstagramContainer(input: {
  instagramUserId: string;
  accessToken: string;
  contentType: InstagramContentType;
  caption?: string | null;
  mediaUrl?: string | null;
  carouselMediaUrls?: string[];
  altText?: string | null;
  isAiGenerated?: boolean;
}) {
  const common = {
    caption: input.contentType === "STORY" ? undefined : input.caption ?? undefined,
    is_ai_generated: input.isAiGenerated ? true : undefined,
  };

  if (input.contentType === "CAROUSEL") {
    const urls = input.carouselMediaUrls ?? [];
    if (urls.length < 2 || urls.length > 10) {
      throw new InstagramApiError("A carousel requires between 2 and 10 public media URLs.", 400, false);
    }

    const children = await Promise.all(
      urls.map((url) =>
        createContainer(input.instagramUserId, input.accessToken, {
          ...(isVideoUrl(url)
            ? { media_type: "VIDEO", video_url: url }
            : { image_url: url }),
          is_carousel_item: true,
        }),
      ),
    );

    return createContainer(input.instagramUserId, input.accessToken, {
      ...common,
      media_type: "CAROUSEL",
      children: children.join(","),
    });
  }

  if (!input.mediaUrl) {
    throw new InstagramApiError("A public media URL is required before you can publish.", 400, false);
  }

  if (input.contentType === "IMAGE") {
    return createContainer(input.instagramUserId, input.accessToken, {
      ...common,
      image_url: input.mediaUrl,
      alt_text: input.altText ?? undefined,
    });
  }

  return createContainer(input.instagramUserId, input.accessToken, {
    ...common,
    media_type: input.contentType === "REEL" ? "REELS" : "STORIES",
    video_url: isVideoUrl(input.mediaUrl) ? input.mediaUrl : undefined,
    image_url: isVideoUrl(input.mediaUrl) ? undefined : input.mediaUrl,
  });
}

export async function getInstagramContainerStatus(containerId: string, accessToken: string) {
  return graphRequest<{ status_code?: "EXPIRED" | "ERROR" | "FINISHED" | "IN_PROGRESS" | "PUBLISHED" }>(
    containerId,
    accessToken,
    "GET",
    { fields: "status_code" },
  );
}

export async function publishInstagramContainer(instagramUserId: string, containerId: string, accessToken: string) {
  const result = await graphRequest<{ id?: string }>(`${instagramUserId}/media_publish`, accessToken, "POST", {
    creation_id: containerId,
  });
  if (!result.id) {
    throw new InstagramApiError("Instagram did not confirm the published media ID.", 502, false);
  }
  return result.id;
}
