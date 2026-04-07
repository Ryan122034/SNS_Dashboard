import type {
  ChannelSummary,
  MetricCard,
  PostPerformance,
  SyncJob
} from "@/types/dashboard";

export const metricCards: MetricCard[] = [
  {
    id: "tracked-posts",
    label: "Tracked Posts",
    value: "128",
    delta: "+12 this week",
    tone: "positive"
  },
  {
    id: "daily-views",
    label: "Daily Views Delta",
    value: "+84.2K",
    delta: "+16.8%",
    tone: "positive"
  },
  {
    id: "engagement",
    label: "Engagement Shift",
    value: "+6.4%",
    delta: "Likes + Comments",
    tone: "positive"
  },
  {
    id: "api-readiness",
    label: "API Readiness",
    value: "3/5",
    delta: "YouTube first",
    tone: "caution"
  }
];

export const channels: ChannelSummary[] = [
  {
    id: "yt-brand-main",
    name: "Brand Main",
    platform: "YouTube",
    handle: "@brandmain",
    contentCount: 46,
    followers: 128000,
    growthRate: 12.4,
    lastSyncAt: "2026-04-07 22:30 KST"
  },
  {
    id: "tt-brand-clips",
    name: "Brand Clips",
    platform: "TikTok",
    handle: "@brandclips",
    contentCount: 29,
    followers: 81400,
    growthRate: 7.8,
    lastSyncAt: "2026-04-07 22:20 KST"
  },
  {
    id: "ig-brand-story",
    name: "Brand Story",
    platform: "Instagram",
    handle: "@brand.story",
    contentCount: 53,
    followers: 64300,
    growthRate: 4.1,
    lastSyncAt: "2026-04-07 21:55 KST"
  }
];

export const posts: PostPerformance[] = [
  {
    id: "yt-1",
    channelId: "yt-brand-main",
    platform: "YouTube",
    title: "April Product Launch Walkthrough",
    kind: "Video",
    publishedAt: "2026-04-04 09:00 KST",
    url: "https://youtube.com",
    current: {
      views: 42815,
      likes: 2910,
      comments: 214
    },
    previous: {
      views: 36640,
      likes: 2488,
      comments: 182
    }
  },
  {
    id: "yt-2",
    channelId: "yt-brand-main",
    platform: "YouTube",
    title: "3 Tips in 30 Seconds",
    kind: "Short",
    publishedAt: "2026-04-06 12:30 KST",
    url: "https://youtube.com",
    current: {
      views: 96320,
      likes: 6842,
      comments: 96
    },
    previous: {
      views: 71220,
      likes: 5410,
      comments: 73
    }
  },
  {
    id: "ig-1",
    channelId: "ig-brand-story",
    platform: "Instagram",
    title: "Behind the Scenes Reel",
    kind: "Reel",
    publishedAt: "2026-04-05 18:00 KST",
    url: "https://instagram.com",
    current: {
      views: 28840,
      likes: 1802,
      comments: 118
    },
    previous: {
      views: 24110,
      likes: 1604,
      comments: 103
    }
  },
  {
    id: "tt-1",
    channelId: "tt-brand-clips",
    platform: "TikTok",
    title: "Quick Feature Demo",
    kind: "Video",
    publishedAt: "2026-04-06 16:10 KST",
    url: "https://tiktok.com",
    current: {
      views: 51400,
      likes: 4398,
      comments: 147
    },
    previous: {
      views: 42050,
      likes: 3711,
      comments: 119
    }
  }
];

export const syncJobs: SyncJob[] = [
  {
    id: "job-youtube",
    platform: "YouTube",
    status: "Healthy",
    cadence: "Hourly",
    note: "Official API + daily historical snapshot"
  },
  {
    id: "job-instagram",
    platform: "Instagram",
    status: "Review",
    cadence: "Daily",
    note: "Business account token and app review pending"
  },
  {
    id: "job-facebook",
    platform: "Facebook",
    status: "Review",
    cadence: "Daily",
    note: "Page access token and post insight mapping needed"
  },
  {
    id: "job-tiktok",
    platform: "TikTok",
    status: "Review",
    cadence: "Daily",
    note: "Developer app setup and access scope confirmation needed"
  },
  {
    id: "job-x",
    platform: "X",
    status: "Blocked",
    cadence: "Manual",
    note: "Pricing and read limits need approval"
  }
];

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value);
}

export function calculateDelta(current: number, previous: number): number {
  return current - previous;
}

export function calculateDeltaRate(current: number, previous: number): number {
  if (previous === 0) {
    return 0;
  }

  return ((current - previous) / previous) * 100;
}
