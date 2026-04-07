export type Platform = "YouTube" | "TikTok" | "Instagram" | "Facebook" | "X";

export type PostKind = "Video" | "Short" | "Post" | "Reel";

export interface ChannelSummary {
  id: string;
  name: string;
  platform: Platform;
  handle: string;
  contentCount: number;
  followers: number;
  growthRate: number;
  lastSyncAt: string;
}

export interface MetricCard {
  id: string;
  label: string;
  value: string;
  delta: string;
  tone: "positive" | "neutral" | "caution";
}

export interface PostSnapshot {
  views: number;
  likes: number;
  comments: number;
}

export interface PostPerformance {
  id: string;
  channelId: string;
  platform: Platform;
  title: string;
  kind: PostKind;
  publishedAt: string;
  url: string;
  current: PostSnapshot;
  previous: PostSnapshot;
}

export interface SyncJob {
  id: string;
  platform: Platform;
  status: "Healthy" | "Review" | "Blocked";
  cadence: string;
  note: string;
}
