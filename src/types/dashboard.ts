export type PlatformKey =
  | "youtube"
  | "tiktok"
  | "x"
  | "instagram"
  | "facebook";

export type DetailTab = "postStatus" | "workHistory";

export type WorkContentType = "Channel" | "Videos" | "Shorts" | "Posts";

export type WorkStatus = "Completed" | "Processing" | "Pending" | "Failed";

export type DashboardDataSource = "fallback" | "supabase";

export interface ManagedChannelEntry {
  id: string;
  platform: PlatformKey;
  alias: string;
  url: string;
}

export interface PostStatusRow {
  id: string;
  date: string;
  url: string;
  title: string;
  currentViews: number;
  dailyViewDelta: number;
  currentLikes: number;
  dailyLikeDelta: number;
  currentComments: number;
  dailyCommentDelta: number;
}

export interface WorkHistoryRow {
  id: string;
  date: string;
  contentType: WorkContentType;
  taskStatus: WorkStatus;
  url: string;
  campaignId: string;
  quantity: string;
  costUsd: string;
}

export interface PlatformPageMeta {
  key: PlatformKey;
  name: string;
  description: string;
  lastUpdated: string;
}

export interface DashboardInitialData {
  dataSource: DashboardDataSource;
  managedChannels: ManagedChannelEntry[];
  postStatusByChannelId: Record<string, PostStatusRow[]>;
  workHistoryByChannelId: Record<string, WorkHistoryRow[]>;
}

export interface CreateManagedChannelInput {
  platform: PlatformKey;
  alias: string;
  url: string;
}

export interface SaveWorkHistoryInput {
  channelId: string;
  date: string;
  contentType: WorkContentType;
  taskStatus: WorkStatus;
  url: string;
  campaignId: string;
  quantity: string;
  costUsd: string;
}
