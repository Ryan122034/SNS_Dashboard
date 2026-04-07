import "server-only";

import {
  createFallbackDashboardState,
  initialManagedChannels,
  initialPostStatusRowsByPlatform,
  initialWorkHistoryRowsByPlatform
} from "@/lib/dashboard-data";
import { createSupabaseAdminClient, hasSupabaseServerEnv } from "@/lib/supabase";
import type {
  CreateManagedChannelInput,
  DashboardInitialData,
  ManagedChannelEntry,
  PostStatusRow,
  SaveWorkHistoryInput,
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

type WorkHistoryRecord = {
  id: string;
  channel_id: string;
  date: string;
  content_type: WorkHistoryRow["contentType"];
  task_status: WorkHistoryRow["taskStatus"];
  url: string;
  campaign_id: string;
  quantity: string;
  cost_usd: string;
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
          "id, channel_id, date, content_type, task_status, url, campaign_id, quantity, cost_usd"
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

    return {
      dataSource: "supabase",
      managedChannels,
      postStatusByChannelId,
      workHistoryByChannelId
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
      campaign_id: input.campaignId,
      quantity: input.quantity,
      cost_usd: input.costUsd
    })
    .select(
      "id, channel_id, date, content_type, task_status, url, campaign_id, quantity, cost_usd"
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
      campaign_id: input.campaignId,
      quantity: input.quantity,
      cost_usd: input.costUsd
    })
    .eq("id", id)
    .select(
      "id, channel_id, date, content_type, task_status, url, campaign_id, quantity, cost_usd"
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
        campaign_id: row.campaignId,
        quantity: row.quantity,
        cost_usd: row.costUsd
      }))
  );

  const { error: insertPostsError } = await supabase
    .from("post_status_records")
    .insert(postSeedRows);

  if (insertPostsError) {
    throw insertPostsError;
  }

  const { error: insertWorkHistoryError } = await supabase
    .from("work_history_records")
    .insert(workSeedRows);

  if (insertWorkHistoryError) {
    throw insertWorkHistoryError;
  }
}

function createEmptyChannelMap<T>(channels: ManagedChannelEntry[]) {
  return Object.fromEntries(channels.map((channel) => [channel.id, []])) as Record<
    string,
    T[]
  >;
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
    campaignId: record.campaign_id,
    quantity: record.quantity,
    costUsd: record.cost_usd
  };
}
