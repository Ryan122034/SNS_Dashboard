import "server-only";

import type { PostStatusRow } from "@/types/dashboard";

type YoutubeCollectionType = "videos" | "shorts";

interface YoutubePostReference {
  videoId: string;
  type: YoutubeCollectionType;
}

const YOUTUBE_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9"
};

export async function scrapeYoutubeChannelPostStatus(
  channelUrl: string
): Promise<PostStatusRow[]> {
  const channelBaseUrl = normalizeChannelBaseUrl(channelUrl);
  const [videoIds, shortIds] = await Promise.all([
    fetchYoutubeCollectionIds(`${channelBaseUrl}/videos`),
    fetchYoutubeCollectionIds(`${channelBaseUrl}/shorts`)
  ]);

  const references = [
    ...videoIds.map((videoId) => ({
      videoId,
      type: "videos" as const
    })),
    ...shortIds
      .filter((videoId) => !videoIds.includes(videoId))
      .map((videoId) => ({
        videoId,
        type: "shorts" as const
      }))
  ];

  const results = await mapWithConcurrency(references, 4, async (reference) => {
    try {
      return await fetchYoutubePost(reference);
    } catch (error) {
      console.error(
        `Failed to scrape YouTube post ${reference.videoId}:`,
        error
      );
      return null;
    }
  });

  return results.filter((item): item is PostStatusRow => item !== null);
}

async function fetchYoutubeCollectionIds(url: string) {
  const html = await fetchHtml(url);
  const matches = [...html.matchAll(/"videoId":"([^"]+)"/g)];
  const seen = new Set<string>();
  const ids: string[] = [];

  for (const match of matches) {
    const videoId = match[1];

    if (!videoId || seen.has(videoId)) {
      continue;
    }

    seen.add(videoId);
    ids.push(videoId);
  }

  return ids;
}

async function fetchYoutubePost(reference: YoutubePostReference) {
  const watchUrl = `https://www.youtube.com/watch?v=${reference.videoId}`;
  const html = await fetchHtml(watchUrl);

  const title =
    decodeHtml(extractFirst(html, /property="og:title" content="([^"]+)"/i)) ??
    decodeYoutubeString(
      extractFirst(html, /"title":"((?:\\.|[^"\\])*)"/)
    ) ??
    reference.videoId;
  const publishedAt =
    extractFirst(html, /itemprop="datePublished" content="([^"]+)"/i) ??
    new Date().toISOString();
  const currentViews = parseNumericValue(
    extractFirst(html, /"viewCount":"([0-9]+)"/)
  );
  const currentLikes = parseNumericValue(
    extractFirst(html, /"likeCount":"([0-9]+)"/)
  );
  const currentComments = parseNumericValue(
    extractFirst(html, /"commentCount":"([0-9]+)"/)
  );

  return {
    id: `yt-post-${reference.videoId}`,
    date: publishedAt.slice(0, 10),
    url:
      reference.type === "shorts"
        ? `https://www.youtube.com/shorts/${reference.videoId}`
        : watchUrl,
    title,
    currentViews,
    dailyViewDelta: 0,
    currentLikes,
    dailyLikeDelta: 0,
    currentComments,
    dailyCommentDelta: 0
  };
}

async function fetchHtml(url: string) {
  const response = await fetch(url, {
    headers: YOUTUBE_HEADERS,
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  return response.text();
}

function normalizeChannelBaseUrl(url: string) {
  const normalized = url.startsWith("http") ? url : `https://${url}`;
  const parsed = new URL(normalized);

  return `${parsed.origin}${parsed.pathname.replace(/\/$/, "")}`;
}

function extractFirst(html: string, pattern: RegExp) {
  return pattern.exec(html)?.[1] ?? null;
}

function parseNumericValue(value: string | null) {
  if (!value) {
    return 0;
  }

  const numeric = Number.parseInt(value, 10);

  return Number.isFinite(numeric) ? numeric : 0;
}

function decodeYoutubeString(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(`"${value}"`);
  } catch {
    return value;
  }
}

function decodeHtml(value: string | null) {
  if (!value) {
    return null;
  }

  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

async function mapWithConcurrency<TInput, TOutput>(
  items: TInput[],
  concurrency: number,
  worker: (item: TInput) => Promise<TOutput>
) {
  const results: TOutput[] = new Array(items.length);
  let cursor = 0;

  async function runWorker() {
    while (cursor < items.length) {
      const currentIndex = cursor;
      cursor += 1;
      results[currentIndex] = await worker(items[currentIndex]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => runWorker())
  );

  return results;
}
