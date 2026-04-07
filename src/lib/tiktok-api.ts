import "server-only";

import { getTikTokChannelCredentials, upsertTikTokChannelCredentials } from "@/lib/channel-auth-store";
import { hasTikTokOAuthEnv } from "@/lib/tiktok-oauth";
import type { PostStatusRow } from "@/types/dashboard";

const TIKTOK_API_BASE_URL = "https://open.tiktokapis.com";
const TIKTOK_VIDEO_FIELDS = [
  "id",
  "create_time",
  "share_url",
  "video_description",
  "title",
  "like_count",
  "comment_count",
  "view_count"
].join(",");

type TikTokVideoListResponse = {
  data?: {
    videos?: TikTokVideoObject[];
    cursor?: number;
    has_more?: boolean;
  };
  error?: {
    code?: string;
    message?: string;
    log_id?: string;
  };
};

type TikTokTokenResponse = {
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

type TikTokVideoObject = {
  id: string;
  create_time: number;
  share_url?: string;
  video_description?: string;
  title?: string;
  like_count?: number;
  comment_count?: number;
  view_count?: number;
};

export function hasTikTokSyncEnv() {
  return Boolean(process.env.TIKTOK_ACCESS_TOKEN?.trim() || hasTikTokOAuthEnv());
}

export async function scrapeTikTokChannelPostStatus(
  channelId: string,
  channelUrl: string
): Promise<PostStatusRow[]> {
  const accessToken = await getTikTokAccessToken(channelId);
  const normalizedChannelUrl = normalizeChannelUrl(channelUrl);
  const rows: PostStatusRow[] = [];
  let cursor = 0;
  let hasMore = true;

  while (hasMore) {
    const response = await fetch(
      `${TIKTOK_API_BASE_URL}/v2/video/list/?fields=${encodeURIComponent(
        TIKTOK_VIDEO_FIELDS
      )}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          cursor,
          max_count: 20
        }),
        cache: "no-store"
      }
    );

    if (!response.ok) {
      throw new Error(
        `TikTok video list request failed: ${response.status} ${response.statusText}`
      );
    }

    const result = (await response.json()) as TikTokVideoListResponse;

    if (result.error?.code && result.error.code !== "ok") {
      throw new Error(
        `TikTok video list error: ${result.error.message ?? result.error.code}`
      );
    }

    const videos = result.data?.videos ?? [];
    rows.push(
      ...videos.map((video) => mapTikTokVideoToPostStatusRow(video, normalizedChannelUrl))
    );

    hasMore = Boolean(result.data?.has_more);
    cursor = result.data?.cursor ?? 0;
  }

  const uniqueRows = new Map<string, PostStatusRow>();

  for (const row of rows) {
    if (!uniqueRows.has(row.url)) {
      uniqueRows.set(row.url, row);
    }
  }

  return [...uniqueRows.values()].sort(
    (left, right) =>
      right.date.localeCompare(left.date) || left.title.localeCompare(right.title)
  );
}

async function getTikTokAccessToken(channelId: string) {
  const directToken = process.env.TIKTOK_ACCESS_TOKEN?.trim();

  if (directToken) {
    return directToken;
  }

  const credentials = await getTikTokChannelCredentials(channelId);

  if (!credentials?.refreshToken && !credentials?.accessToken) {
    throw new Error("TikTok channel is not connected yet.");
  }

  if (credentials?.accessToken && !isExpired(credentials.expiresAt)) {
    return credentials.accessToken;
  }

  if (!hasTikTokOAuthEnv()) {
    throw new Error(
      "TikTok OAuth credentials are not configured. Add TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET."
    );
  }

  if (!credentials?.refreshToken) {
    throw new Error("TikTok refresh token is missing for this channel.");
  }

  const response = await fetch(`${TIKTOK_API_BASE_URL}/v2/oauth/token/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Cache-Control": "no-cache"
    },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY?.trim() ?? "",
      client_secret: process.env.TIKTOK_CLIENT_SECRET?.trim() ?? "",
      grant_type: "refresh_token",
      refresh_token: credentials.refreshToken
    }),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(
      `TikTok token refresh failed: ${response.status} ${response.statusText}`
    );
  }

  const result = (await response.json()) as TikTokTokenResponse;

  if (!result.access_token) {
    throw new Error(
      `TikTok token refresh did not return an access token: ${
        result.error_description ?? result.error ?? "unknown error"
      }`
    );
  }

  const now = Date.now();

  await upsertTikTokChannelCredentials({
    channelId,
    externalUserId: result.open_id ?? credentials.externalUserId,
    accessToken: result.access_token,
    refreshToken: result.refresh_token ?? credentials.refreshToken,
    scope: result.scope ?? credentials.scope,
    tokenType: result.token_type ?? credentials.tokenType,
    expiresAt: result.expires_in
      ? new Date(now + result.expires_in * 1000).toISOString()
      : credentials.expiresAt,
    refreshExpiresAt: result.refresh_expires_in
      ? new Date(now + result.refresh_expires_in * 1000).toISOString()
      : credentials.refreshExpiresAt
  });

  return result.access_token;
}

function mapTikTokVideoToPostStatusRow(
  video: TikTokVideoObject,
  channelUrl: string
): PostStatusRow {
  const title =
    video.title?.trim() ||
    video.video_description?.trim() ||
    `TikTok Video ${video.id}`;
  const createdAt = new Date((video.create_time ?? 0) * 1000);
  const isValidDate = Number.isFinite(createdAt.getTime());
  const shareUrl =
    normalizeShareUrl(video.share_url) ?? `${channelUrl}/video/${video.id}`;

  return {
    id: `tt-post-${video.id}`,
    date: isValidDate
      ? createdAt.toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10),
    url: shareUrl,
    title,
    currentViews: normalizeCount(video.view_count),
    dailyViewDelta: 0,
    currentLikes: normalizeCount(video.like_count),
    dailyLikeDelta: 0,
    currentComments: normalizeCount(video.comment_count),
    dailyCommentDelta: 0
  };
}

function normalizeCount(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.trunc(value));
}

function normalizeShareUrl(value: string | undefined) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function normalizeChannelUrl(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  return /^https?:\/\//i.test(trimmed)
    ? trimmed.replace(/\/$/, "")
    : `https://${trimmed.replace(/\/$/, "")}`;
}

function isExpired(value: string | null | undefined) {
  if (!value) {
    return true;
  }

  const expiresAt = new Date(value).getTime();

  if (!Number.isFinite(expiresAt)) {
    return true;
  }

  return expiresAt <= Date.now() + 1000 * 60 * 5;
}
