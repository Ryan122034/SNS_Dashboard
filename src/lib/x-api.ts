import "server-only";

import type { PostStatusRow } from "@/types/dashboard";

const X_API_BASE_URL = "https://api.x.com/2";

type XUserLookupResponse = {
  data?: {
    id: string;
    username: string;
    name?: string;
  };
  errors?: Array<{
    detail?: string;
    title?: string;
  }>;
};

type XTimelineResponse = {
  data?: XPostObject[];
  meta?: {
    next_token?: string;
    result_count?: number;
  };
  errors?: Array<{
    detail?: string;
    title?: string;
  }>;
};

type XPostObject = {
  id: string;
  text: string;
  created_at?: string;
  public_metrics?: {
    like_count?: number;
    reply_count?: number;
    repost_count?: number;
    retweet_count?: number;
    quote_count?: number;
    impression_count?: number;
  };
};

export function hasXSyncEnv() {
  return Boolean(process.env.X_BEARER_TOKEN?.trim());
}

export async function scrapeXChannelPostStatus(channelUrl: string): Promise<PostStatusRow[]> {
  const bearerToken = process.env.X_BEARER_TOKEN?.trim();

  if (!bearerToken) {
    throw new Error("X sync requires X_BEARER_TOKEN.");
  }

  const username = extractXUsername(channelUrl);
  const user = await fetchXUserByUsername(username, bearerToken);
  const posts = await fetchXUserPosts(user.id, bearerToken);

  return posts
    .map((post) => mapXPostToStatusRow(username, post))
    .sort((left, right) => right.date.localeCompare(left.date) || left.title.localeCompare(right.title));
}

async function fetchXUserByUsername(username: string, bearerToken: string) {
  const response = await fetch(
    `${X_API_BASE_URL}/users/by/username/${encodeURIComponent(username)}`,
    {
      headers: {
        Authorization: `Bearer ${bearerToken}`
      },
      cache: "no-store"
    }
  );

  if (!response.ok) {
    throw new Error(
      `X user lookup failed: ${response.status} ${response.statusText}`
    );
  }

  const result = (await response.json()) as XUserLookupResponse;

  if (!result.data?.id) {
    throw new Error(result.errors?.[0]?.detail ?? "X user lookup returned no user.");
  }

  return result.data;
}

async function fetchXUserPosts(userId: string, bearerToken: string) {
  const posts: XPostObject[] = [];
  let nextToken: string | null = null;

  do {
    const url = new URL(`${X_API_BASE_URL}/users/${encodeURIComponent(userId)}/tweets`);
    url.searchParams.set("max_results", "100");
    url.searchParams.set("exclude", "retweets,replies");
    url.searchParams.set("tweet.fields", "created_at,public_metrics");

    if (nextToken) {
      url.searchParams.set("pagination_token", nextToken);
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${bearerToken}`
      },
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(
        `X post timeline failed: ${response.status} ${response.statusText}`
      );
    }

    const result = (await response.json()) as XTimelineResponse;

    if (result.errors?.length) {
      throw new Error(result.errors[0]?.detail ?? "X post timeline returned an error.");
    }

    posts.push(...(result.data ?? []));
    nextToken = result.meta?.next_token ?? null;
  } while (nextToken);

  return posts;
}

function mapXPostToStatusRow(username: string, post: XPostObject): PostStatusRow {
  const createdAt = post.created_at ? new Date(post.created_at) : new Date();
  const text = truncatePostText(normalizeXPostText(post.text), 30);
  const metrics = post.public_metrics ?? {};
  const impressionCount =
    typeof metrics.impression_count === "number" ? metrics.impression_count : 0;

  return {
    id: `x-post-${post.id}`,
    date: Number.isFinite(createdAt.getTime())
      ? createdAt.toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10),
    url: `https://x.com/${username}/status/${post.id}`,
    title: text || `Post ${post.id}`,
    currentViews: impressionCount,
    dailyViewDelta: 0,
    currentLikes: normalizeMetric(metrics.like_count),
    dailyLikeDelta: 0,
    currentComments: normalizeMetric(metrics.reply_count),
    dailyCommentDelta: 0
  };
}

function extractXUsername(channelUrl: string) {
  const normalized = /^https?:\/\//i.test(channelUrl)
    ? channelUrl
    : `https://${channelUrl}`;
  const parsed = new URL(normalized);
  const [username] = parsed.pathname.replace(/^\/+/, "").split("/");

  if (!username) {
    throw new Error("Invalid X channel URL.");
  }

  return username.replace(/^@/, "");
}

function normalizeMetric(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.trunc(value));
}

function normalizeXPostText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function truncatePostText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}
