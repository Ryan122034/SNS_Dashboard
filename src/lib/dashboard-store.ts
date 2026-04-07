import "server-only";

import {
  createFallbackDashboardState,
  initialManagedChannels,
  initialPostStatusRowsByPlatform,
  initialWorkHistoryRowsByPlatform
} from "@/lib/dashboard-data";
import { getChannelAuthStatusByChannelIds } from "@/lib/channel-auth-store";
import { getKstDateString } from "@/lib/kst-time";
import { createSupabaseAdminClient, hasSupabaseServerEnv } from "@/lib/supabase";
import { hasTikTokSyncEnv, scrapeTikTokChannelPostStatus } from "@/lib/tiktok-api";
import { hasTikTokOAuthEnv } from "@/lib/tiktok-oauth";
import { hasXSyncEnv, scrapeXChannelPostStatus } from "@/lib/x-api";
import { scrapeYoutubeChannelPostStatus } from "@/lib/youtube-scraper";
import type {
  CreateManagedChannelInput,
  DashboardInitialData,
  ManagedChannelEntry,
  PlatformKey,
  PostStatusRow,
  SaveWorkHistoryInput,
  UpdateManagedChannelAliasInput,
  WorkHistoryRow
} from "@/types/dashboard";

type ManagedChannelRecord = {
  id: string;
  platform: ManagedChannelEntry["platform"];
  alias: string;
  url: string;
  created_at: string;
};

type PostStatusRecord = {
  id: string;
  channel_id: string;
  date: string;
  url: string;
  title: string;
  current_views: number;
  daily_view_delta: number;
  current_likes: number;
  daily_like_delta: number;
  current_comments: number;
  daily_comment_delta: number;
};

type PostStatusDailySnapshotRecord = {
  id: string;
  channel_id: string;
  captured_date: string;
  url: string;
  title: string;
  current_views: number;
  current_likes: number;
  current_comments: number;
};

type WorkHistoryRecord = {
  id: string;
  channel_id: string;
  date: string;
  content_type: WorkHistoryRow["contentType"];
  task_status: WorkHistoryRow["taskStatus"];
  url: string;
  campaign_service: WorkHistoryRow["campaignService"];
  campaign_id: string;
  quantity: string;
  cost_usd: string;
};

type MetricSnapshot = {
  currentViews: number;
  currentLikes: number;
  currentComments: number;
};

export type PlatformChannelSyncResult = {
  channelId: string;
  platform: PlatformKey;
  syncDate: string;
  rows: PostStatusRow[];
  createdCount: number;
  updatedCount: number;
};

export type PlatformSyncRunResult = {
  platform: PlatformKey;
  syncDate: string;
  channelCount: number;
  postCount: number;
  createdCount: number;
  updatedCount: number;
  skipped: boolean;
  reason?: string;
  channels: Array<{
    channelId: string;
    alias: string;
    postCount: number;
    createdCount: number;
    updatedCount: number;
  }>;
};

export type DailyPostStatusSyncResult = {
  syncDate: string;
  results: PlatformSyncRunResult[];
};

export async function getDashboardState(): Promise<DashboardInitialData> {
  if (!hasSupabaseServerEnv()) {
    return createFallbackDashboardState();
  }

  try {
    const supabase = createSupabaseAdminClient();

    await ensureDashboardSeedData();

    const [channelsResult, postStatusResult, workHistoryResult] = await Promise.all([
      supabase
        .from("managed_channels")
        .select("id, platform, alias, url, created_at")
        .order("created_at", { ascending: true }),
      supabase
        .from("post_status_records")
        .select(
          "id, channel_id, date, url, title, current_views, daily_view_delta, current_likes, daily_like_delta, current_comments, daily_comment_delta"
        )
        .order("date", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("work_history_records")
        .select(
          "id, channel_id, date, content_type, task_status, url, campaign_service, campaign_id, quantity, cost_usd"
        )
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
    ]);

    if (channelsResult.error || postStatusResult.error || workHistoryResult.error) {
      throw (
        channelsResult.error ??
        postStatusResult.error ??
        workHistoryResult.error ??
        new Error("Failed to load dashboard state.")
      );
    }

    const managedChannels = channelsResult.data.map(mapManagedChannelRecord);
    const channelAuthStatusByChannelId = await getChannelAuthStatusByChannelIds(
      managedChannels
    );
    const postStatusByChannelId = createEmptyChannelMap<PostStatusRow>(
      managedChannels
    );
    const workHistoryByChannelId = createEmptyChannelMap<WorkHistoryRow>(
      managedChannels
    );

    for (const row of postStatusResult.data as PostStatusRecord[]) {
      if (!postStatusByChannelId[row.channel_id]) {
        postStatusByChannelId[row.channel_id] = [];
      }

      postStatusByChannelId[row.channel_id].push(mapPostStatusRecord(row));
    }

    for (const row of workHistoryResult.data as WorkHistoryRecord[]) {
      if (!workHistoryByChannelId[row.channel_id]) {
        workHistoryByChannelId[row.channel_id] = [];
      }

      workHistoryByChannelId[row.channel_id].push(mapWorkHistoryRecord(row));
    }

    for (const channel of managedChannels) {
      const hasPostRows = (postStatusByChannelId[channel.id] ?? []).length > 0;

      const isConnected =
        channelAuthStatusByChannelId[channel.id]?.connected ?? false;

      if (
        hasPostRows ||
        !canAutoSyncPlatform(channel.platform) ||
        (channel.platform === "tiktok" && !isConnected)
      ) {
        continue;
      }

      try {
        const syncResult = await syncManagedChannelPosts(
          channel.id,
          channel.platform,
          channel.url
        );
        postStatusByChannelId[channel.id] = syncResult.rows;
      } catch (error) {
        console.error(
          `Failed to sync ${channel.platform} post status for channel ${channel.id}:`,
          error
        );
      }
    }

    return {
      dataSource: "supabase",
      managedChannels,
      postStatusByChannelId,
      workHistoryByChannelId,
      channelAuthStatusByChannelId,
      tiktokOAuthEnabled: hasTikTokOAuthEnv()
    };
  } catch (error) {
    console.error("Failed to load dashboard data from Supabase:", error);
    return createFallbackDashboardState();
  }
}

export async function createManagedChannel(
  input: CreateManagedChannelInput
): Promise<ManagedChannelEntry> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("managed_channels")
    .insert({
      platform: input.platform,
      alias: input.alias,
      url: input.url
    })
    .select("id, platform, alias, url, created_at")
    .single();

  if (error) {
    throw error;
  }

  return mapManagedChannelRecord(data as ManagedChannelRecord);
}

export async function updateManagedChannelAlias(
  id: string,
  input: UpdateManagedChannelAliasInput
): Promise<ManagedChannelEntry> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("managed_channels")
    .update({
      alias: input.alias
    })
    .eq("id", id)
    .select("id, platform, alias, url, created_at")
    .single();

  if (error) {
    throw error;
  }

  return mapManagedChannelRecord(data as ManagedChannelRecord);
}

export async function deleteManagedChannel(id: string) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("managed_channels").delete().eq("id", id);

  if (error) {
    throw error;
  }
}

export async function createWorkHistory(
  input: SaveWorkHistoryInput
): Promise<WorkHistoryRow> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("work_history_records")
    .insert({
      channel_id: input.channelId,
      date: input.date,
      content_type: input.contentType,
      task_status: input.taskStatus,
      url: input.url,
      campaign_service: input.campaignService,
      campaign_id: input.campaignId,
      quantity: input.quantity,
      cost_usd: input.costUsd
    })
    .select(
      "id, channel_id, date, content_type, task_status, url, campaign_service, campaign_id, quantity, cost_usd"
    )
    .single();

  if (error) {
    throw error;
  }

  return mapWorkHistoryRecord(data as WorkHistoryRecord);
}

export async function updateWorkHistory(
  id: string,
  input: SaveWorkHistoryInput
): Promise<WorkHistoryRow> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("work_history_records")
    .update({
      channel_id: input.channelId,
      date: input.date,
      content_type: input.contentType,
      task_status: input.taskStatus,
      url: input.url,
      campaign_service: input.campaignService,
      campaign_id: input.campaignId,
      quantity: input.quantity,
      cost_usd: input.costUsd
    })
    .eq("id", id)
    .select(
      "id, channel_id, date, content_type, task_status, url, campaign_service, campaign_id, quantity, cost_usd"
    )
    .single();

  if (error) {
    throw error;
  }

  return mapWorkHistoryRecord(data as WorkHistoryRecord);
}

export async function deleteWorkHistory(id: string) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("work_history_records").delete().eq("id", id);

  if (error) {
    throw error;
  }
}

export async function syncYoutubeChannelPosts(
  channelId: string,
  channelUrl: string,
  options?: {
    syncDate?: string;
  }
): Promise<PlatformChannelSyncResult> {
  const rows = await scrapeYoutubeChannelPostStatus(channelUrl);
  return persistChannelPostStatus("youtube", channelId, rows, options?.syncDate ?? getKstDateString());
}

export async function syncTikTokChannelPosts(
  channelId: string,
  channelUrl: string,
  options?: {
    syncDate?: string;
  }
): Promise<PlatformChannelSyncResult> {
  const rows = await scrapeTikTokChannelPostStatus(channelId, channelUrl);
  return persistChannelPostStatus("tiktok", channelId, rows, options?.syncDate ?? getKstDateString());
}

export async function syncAllYoutubeChannels(
  syncDate = getKstDateString()
): Promise<PlatformSyncRunResult> {
  return syncAllChannelsForPlatform("youtube", syncDate);
}

export async function syncAllTikTokChannels(
  syncDate = getKstDateString()
): Promise<PlatformSyncRunResult> {
  return syncAllChannelsForPlatform("tiktok", syncDate);
}

export async function syncAllXChannels(
  syncDate = getKstDateString()
): Promise<PlatformSyncRunResult> {
  return syncAllChannelsForPlatform("x", syncDate);
}

export async function syncDailyPostStatusPlatforms(
  syncDate = getKstDateString()
): Promise<DailyPostStatusSyncResult> {
  const [youtubeResult, tiktokResult, xResult] = await Promise.all([
    syncAllYoutubeChannels(syncDate),
    syncAllTikTokChannels(syncDate),
    syncAllXChannels(syncDate)
  ]);

  return {
    syncDate,
    results: [youtubeResult, tiktokResult, xResult]
  };
}

async function syncAllChannelsForPlatform(
  platform: PlatformKey,
  syncDate: string
): Promise<PlatformSyncRunResult> {
  if (!canAutoSyncPlatform(platform)) {
    return {
      platform,
      syncDate,
      channelCount: 0,
      postCount: 0,
      createdCount: 0,
      updatedCount: 0,
      skipped: true,
      reason:
        platform === "tiktok"
          ? "TikTok sync requires an access token or refresh-token credentials."
          : platform === "x"
            ? "X sync requires X_BEARER_TOKEN."
          : `Automatic sync is not configured for ${platform}.`,
      channels: []
    };
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("managed_channels")
    .select("id, platform, alias, url, created_at")
    .eq("platform", platform)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  const channels = (data as ManagedChannelRecord[]).map(mapManagedChannelRecord);
  const channelAuthStatusByChannelId = await getChannelAuthStatusByChannelIds(channels);
  const syncableChannels = channels.filter((channel) => {
    if (platform !== "tiktok") {
      return true;
    }

    return channelAuthStatusByChannelId[channel.id]?.connected ?? false;
  });

  if (platform === "tiktok" && syncableChannels.length === 0) {
    return {
      platform,
      syncDate,
      channelCount: 0,
      postCount: 0,
      createdCount: 0,
      updatedCount: 0,
      skipped: true,
      reason: "No connected TikTok channels are available for sync.",
      channels: []
    };
  }

  const results: PlatformSyncRunResult["channels"] = [];

  for (const channel of syncableChannels) {
    const syncResult = await syncManagedChannelPosts(channel.id, channel.platform, channel.url, {
      syncDate
    });

    results.push({
      channelId: channel.id,
      alias: channel.alias,
      postCount: syncResult.rows.length,
      createdCount: syncResult.createdCount,
      updatedCount: syncResult.updatedCount
    });
  }

  return {
    platform,
    syncDate,
    channelCount: results.length,
    postCount: results.reduce((total, channel) => total + channel.postCount, 0),
    createdCount: results.reduce(
      (total, channel) => total + channel.createdCount,
      0
    ),
    updatedCount: results.reduce(
      (total, channel) => total + channel.updatedCount,
      0
    ),
    skipped: false,
    channels: results
  };
}

async function syncManagedChannelPosts(
  channelId: string,
  platform: PlatformKey,
  channelUrl: string,
  options?: {
    syncDate?: string;
  }
) {
  switch (platform) {
    case "youtube":
      return syncYoutubeChannelPosts(channelId, channelUrl, options);
    case "tiktok":
      return syncTikTokChannelPosts(channelId, channelUrl, options);
    case "x":
      return syncXChannelPosts(channelId, channelUrl, options);
    default:
      throw new Error(`Automatic sync is not implemented for ${platform}.`);
  }
}

export async function syncXChannelPosts(
  channelId: string,
  channelUrl: string,
  options?: {
    syncDate?: string;
  }
): Promise<PlatformChannelSyncResult> {
  const rows = await scrapeXChannelPostStatus(channelUrl);
  return persistChannelPostStatus("x", channelId, rows, options?.syncDate ?? getKstDateString());
}

async function ensureDashboardSeedData() {
  const supabase = createSupabaseAdminClient();
  const { count, error } = await supabase
    .from("managed_channels")
    .select("id", { count: "exact", head: true });

  if (error) {
    throw error;
  }

  if ((count ?? 0) > 0) {
    return;
  }

  const { data: insertedChannels, error: insertChannelsError } = await supabase
    .from("managed_channels")
    .insert(
      initialManagedChannels.map((channel) => ({
        platform: channel.platform,
        alias: channel.alias,
        url: channel.url
      }))
    )
    .select("id, platform, alias, url, created_at");

  if (insertChannelsError) {
    throw insertChannelsError;
  }

  const channelIdByPlatform = Object.fromEntries(
    (insertedChannels as ManagedChannelRecord[]).map((channel) => [
      channel.platform,
      channel.id
    ])
  ) as Record<ManagedChannelEntry["platform"], string>;

  const postSeedRows = Object.entries(initialPostStatusRowsByPlatform).flatMap(
    ([platform, rows]) =>
      rows.map((row) => ({
        channel_id: channelIdByPlatform[platform as ManagedChannelEntry["platform"]],
        date: row.date,
        url: row.url,
        title: row.title,
        current_views: row.currentViews,
        daily_view_delta: row.dailyViewDelta,
        current_likes: row.currentLikes,
        daily_like_delta: row.dailyLikeDelta,
        current_comments: row.currentComments,
        daily_comment_delta: row.dailyCommentDelta
      }))
  );

  const workSeedRows = Object.entries(initialWorkHistoryRowsByPlatform).flatMap(
    ([platform, rows]) =>
      rows.map((row) => ({
        channel_id: channelIdByPlatform[platform as ManagedChannelEntry["platform"]],
        date: row.date,
        content_type: row.contentType,
        task_status: row.taskStatus,
        url: row.url,
        campaign_service: row.campaignService,
        campaign_id: row.campaignId,
        quantity: row.quantity,
        cost_usd: row.costUsd
      }))
  );

  if (postSeedRows.length > 0) {
    const { error: insertPostsError } = await supabase
      .from("post_status_records")
      .insert(postSeedRows);

    if (insertPostsError) {
      throw insertPostsError;
    }
  }

  if (workSeedRows.length > 0) {
    const { error: insertWorkHistoryError } = await supabase
      .from("work_history_records")
      .insert(workSeedRows);

    if (insertWorkHistoryError) {
      throw insertWorkHistoryError;
    }
  }
}

function createEmptyChannelMap<T>(channels: ManagedChannelEntry[]) {
  return Object.fromEntries(channels.map((channel) => [channel.id, []])) as Record<
    string,
    T[]
  >;
}

async function persistChannelPostStatus(
  platform: PlatformKey,
  channelId: string,
  scrapedRows: PostStatusRow[],
  syncDate: string
): Promise<PlatformChannelSyncResult> {
  const supabase = createSupabaseAdminClient();
  const [existingRecordsResult, previousSnapshotsResult] = await Promise.all([
    supabase
      .from("post_status_records")
      .select(
        "id, channel_id, date, url, title, current_views, daily_view_delta, current_likes, daily_like_delta, current_comments, daily_comment_delta"
      )
      .eq("channel_id", channelId),
    supabase
      .from("post_status_daily_snapshots")
      .select(
        "id, channel_id, captured_date, url, title, current_views, current_likes, current_comments"
      )
      .eq("channel_id", channelId)
      .lt("captured_date", syncDate)
      .order("captured_date", { ascending: false })
  ]);

  if (existingRecordsResult.error || previousSnapshotsResult.error) {
    throw (
      existingRecordsResult.error ??
      previousSnapshotsResult.error ??
      new Error(`Failed to load ${platform} sync state.`)
    );
  }

  const existingByUrl = new Map<string, PostStatusRecord>();

  for (const record of existingRecordsResult.data as PostStatusRecord[]) {
    if (!existingByUrl.has(record.url)) {
      existingByUrl.set(record.url, record);
    }
  }

  const previousMetricsByUrl = new Map<string, MetricSnapshot>();

  for (const snapshot of previousSnapshotsResult.data as PostStatusDailySnapshotRecord[]) {
    if (!previousMetricsByUrl.has(snapshot.url)) {
      previousMetricsByUrl.set(snapshot.url, mapSnapshotMetrics(snapshot));
    }
  }

  const nextRows = scrapedRows
    .map((row) => {
      const existingRecord = existingByUrl.get(row.url);
      const previousMetrics =
        previousMetricsByUrl.get(row.url) ?? mapRecordMetrics(existingRecord);

      return {
        id: existingRecord?.id ?? row.id,
        date: row.date,
        url: row.url,
        title: row.title,
        currentViews: row.currentViews,
        dailyViewDelta: calculateDelta(row.currentViews, previousMetrics?.currentViews),
        currentLikes: row.currentLikes,
        dailyLikeDelta: calculateDelta(row.currentLikes, previousMetrics?.currentLikes),
        currentComments: row.currentComments,
        dailyCommentDelta: calculateDelta(
          row.currentComments,
          previousMetrics?.currentComments
        )
      };
    })
    .sort(sortPostStatusRows);

  await replaceDailySnapshots(channelId, syncDate, nextRows);
  const { createdCount, updatedCount } = await upsertPostStatusRecords(
    channelId,
    nextRows,
    existingByUrl
  );

  return {
    channelId,
    platform,
    syncDate,
    rows: nextRows,
    createdCount,
    updatedCount
  };
}

async function replaceDailySnapshots(
  channelId: string,
  syncDate: string,
  rows: PostStatusRow[]
) {
  const supabase = createSupabaseAdminClient();
  const { error: deleteError } = await supabase
    .from("post_status_daily_snapshots")
    .delete()
    .eq("channel_id", channelId)
    .eq("captured_date", syncDate);

  if (deleteError) {
    throw deleteError;
  }

  if (rows.length === 0) {
    return;
  }

  const { error: insertError } = await supabase
    .from("post_status_daily_snapshots")
    .insert(
      rows.map((row) => ({
        channel_id: channelId,
        captured_date: syncDate,
        url: row.url,
        title: row.title,
        current_views: row.currentViews,
        current_likes: row.currentLikes,
        current_comments: row.currentComments
      }))
    );

  if (insertError) {
    throw insertError;
  }
}

async function upsertPostStatusRecords(
  channelId: string,
  rows: PostStatusRow[],
  existingByUrl: Map<string, PostStatusRecord>
) {
  const supabase = createSupabaseAdminClient();
  const inserts = rows.filter((row) => !existingByUrl.has(row.url));
  const updates = rows.filter((row) => existingByUrl.has(row.url));

  await Promise.all(
    updates.map(async (row) => {
      const existingRecord = existingByUrl.get(row.url);

      if (!existingRecord) {
        return;
      }

      const { error } = await supabase
        .from("post_status_records")
        .update({
          date: row.date,
          url: row.url,
          title: row.title,
          current_views: row.currentViews,
          daily_view_delta: row.dailyViewDelta,
          current_likes: row.currentLikes,
          daily_like_delta: row.dailyLikeDelta,
          current_comments: row.currentComments,
          daily_comment_delta: row.dailyCommentDelta
        })
        .eq("id", existingRecord.id);

      if (error) {
        throw error;
      }
    })
  );

  if (inserts.length > 0) {
    const { error } = await supabase.from("post_status_records").insert(
      inserts.map((row) => ({
        channel_id: channelId,
        date: row.date,
        url: row.url,
        title: row.title,
        current_views: row.currentViews,
        daily_view_delta: row.dailyViewDelta,
        current_likes: row.currentLikes,
        daily_like_delta: row.dailyLikeDelta,
        current_comments: row.currentComments,
        daily_comment_delta: row.dailyCommentDelta
      }))
    );

    if (error) {
      throw error;
    }
  }

  return {
    createdCount: inserts.length,
    updatedCount: updates.length
  };
}

function canAutoSyncPlatform(platform: PlatformKey) {
  if (platform === "youtube") {
    return true;
  }

  if (platform === "tiktok") {
    return hasTikTokSyncEnv();
  }

  if (platform === "x") {
    return hasXSyncEnv();
  }

  return false;
}

function mapManagedChannelRecord(record: ManagedChannelRecord): ManagedChannelEntry {
  return {
    id: record.id,
    platform: record.platform,
    alias: record.alias,
    url: record.url
  };
}

function mapPostStatusRecord(record: PostStatusRecord): PostStatusRow {
  return {
    id: record.id,
    date: record.date,
    url: record.url,
    title: record.title,
    currentViews: record.current_views,
    dailyViewDelta: record.daily_view_delta,
    currentLikes: record.current_likes,
    dailyLikeDelta: record.daily_like_delta,
    currentComments: record.current_comments,
    dailyCommentDelta: record.daily_comment_delta
  };
}

function mapWorkHistoryRecord(record: WorkHistoryRecord): WorkHistoryRow {
  return {
    id: record.id,
    date: record.date,
    contentType: record.content_type,
    taskStatus: record.task_status,
    url: record.url,
    campaignService: record.campaign_service,
    campaignId: record.campaign_id,
    quantity: record.quantity,
    costUsd: record.cost_usd
  };
}

function mapSnapshotMetrics(snapshot: PostStatusDailySnapshotRecord): MetricSnapshot {
  return {
    currentViews: snapshot.current_views,
    currentLikes: snapshot.current_likes,
    currentComments: snapshot.current_comments
  };
}

function mapRecordMetrics(record: PostStatusRecord | undefined): MetricSnapshot | null {
  if (!record) {
    return null;
  }

  return {
    currentViews: record.current_views,
    currentLikes: record.current_likes,
    currentComments: record.current_comments
  };
}

function calculateDelta(currentValue: number, previousValue?: number | null) {
  if (typeof previousValue !== "number") {
    return 0;
  }

  return currentValue - previousValue;
}

function sortPostStatusRows(left: PostStatusRow, right: PostStatusRow) {
  return right.date.localeCompare(left.date) || left.title.localeCompare(right.title);
}
