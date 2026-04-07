import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

const TIKTOK_AUTHORIZE_URL = "https://www.tiktok.com/v2/auth/authorize/";
const TIKTOK_TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
const TIKTOK_OAUTH_SCOPE = "user.info.basic,video.list";

type TikTokTokenExchangeResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  refresh_expires_in?: number;
  scope?: string;
  token_type?: string;
  open_id?: string;
  error?: string;
  error_description?: string;
};

export function hasTikTokOAuthEnv() {
  return Boolean(
    process.env.TIKTOK_CLIENT_KEY?.trim() && process.env.TIKTOK_CLIENT_SECRET?.trim()
  );
}

export function buildTikTokAuthorizeUrl(requestUrl: string, channelId: string) {
  const clientKey = getRequiredTikTokClientKey();
  const redirectUri = getTikTokRedirectUri(requestUrl);
  const state = createSignedOAuthState({
    channelId,
    issuedAt: Date.now()
  });

  const url = new URL(TIKTOK_AUTHORIZE_URL);
  url.searchParams.set("client_key", clientKey);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", TIKTOK_OAUTH_SCOPE);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);

  return url.toString();
}

export function getTikTokRedirectUri(requestUrl: string) {
  const configured = process.env.TIKTOK_REDIRECT_URI?.trim();

  if (configured) {
    return configured;
  }

  return new URL("/api/tiktok/callback", requestUrl).toString();
}

export function verifyTikTokOAuthState(state: string) {
  const [payload, signature] = state.split(".");

  if (!payload || !signature) {
    throw new Error("Invalid TikTok OAuth state.");
  }

  const expectedSignature = signOAuthStatePayload(payload);
  const provided = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);

  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    throw new Error("TikTok OAuth state verification failed.");
  }

  const parsed = JSON.parse(
    Buffer.from(payload, "base64url").toString("utf8")
  ) as {
    channelId?: string;
    issuedAt?: number;
  };

  if (!parsed.channelId || typeof parsed.issuedAt !== "number") {
    throw new Error("TikTok OAuth state payload is incomplete.");
  }

  const maxAgeMs = 1000 * 60 * 15;

  if (Date.now() - parsed.issuedAt > maxAgeMs) {
    throw new Error("TikTok OAuth state has expired.");
  }

  return {
    channelId: parsed.channelId
  };
}

export async function exchangeTikTokAuthorizationCode(
  requestUrl: string,
  code: string
) {
  const response = await fetch(TIKTOK_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Cache-Control": "no-cache"
    },
    body: new URLSearchParams({
      client_key: getRequiredTikTokClientKey(),
      client_secret: getRequiredTikTokClientSecret(),
      code,
      grant_type: "authorization_code",
      redirect_uri: getTikTokRedirectUri(requestUrl)
    }),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(
      `TikTok OAuth token exchange failed: ${response.status} ${response.statusText}`
    );
  }

  const result = (await response.json()) as TikTokTokenExchangeResponse;

  if (!result.access_token || !result.refresh_token) {
    throw new Error(
      `TikTok OAuth token exchange did not return tokens: ${
        result.error_description ?? result.error ?? "unknown error"
      }`
    );
  }

  const now = Date.now();

  return {
    accessToken: result.access_token,
    refreshToken: result.refresh_token,
    scope: result.scope ?? TIKTOK_OAUTH_SCOPE,
    tokenType: result.token_type ?? "Bearer",
    externalUserId: result.open_id ?? null,
    expiresAt: result.expires_in
      ? new Date(now + result.expires_in * 1000).toISOString()
      : null,
    refreshExpiresAt: result.refresh_expires_in
      ? new Date(now + result.refresh_expires_in * 1000).toISOString()
      : null
  };
}

function createSignedOAuthState(payload: { channelId: string; issuedAt: number }) {
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url"
  );
  const signature = signOAuthStatePayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

function signOAuthStatePayload(payload: string) {
  return createHmac("sha256", getOAuthStateSecret()).update(payload).digest("hex");
}

function getOAuthStateSecret() {
  return (
    process.env.TIKTOK_STATE_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    getRequiredTikTokClientSecret()
  );
}

function getRequiredTikTokClientKey() {
  const value = process.env.TIKTOK_CLIENT_KEY?.trim();

  if (!value) {
    throw new Error("TIKTOK_CLIENT_KEY is not configured.");
  }

  return value;
}

function getRequiredTikTokClientSecret() {
  const value = process.env.TIKTOK_CLIENT_SECRET?.trim();

  if (!value) {
    throw new Error("TIKTOK_CLIENT_SECRET is not configured.");
  }

  return value;
}
