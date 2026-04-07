import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase";
import type { ChannelAuthStatus, PlatformKey } from "@/types/dashboard";

type ChannelAuthTokenRecord = {
  channel_id: string;
  platform: PlatformKey;
  external_user_id: string | null;
  access_token: string | null;
  refresh_token: string | null;
  scope: string | null;
  token_type: string | null;
  expires_at: string | null;
  refresh_expires_at: string | null;
};

export type TikTokChannelCredentials = {
  channelId: string;
  platform: "tiktok";
  externalUserId: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  scope: string | null;
  tokenType: string | null;
  expiresAt: string | null;
  refreshExpiresAt: string | null;
};

type UpsertTikTokChannelCredentialsInput = {
  channelId: string;
  externalUserId?: string | null;
  accessToken?: string | null;
  refreshToken?: string | null;
  scope?: string | null;
  tokenType?: string | null;
  expiresAt?: string | null;
  refreshExpiresAt?: string | null;
};

export async function getChannelAuthStatusByChannelIds(
  channels: Array<{ id: string; platform: PlatformKey }>
): Promise<Record<string, ChannelAuthStatus>> {
  const baseMap = Object.fromEntries(
    channels.map((channel) => [
      channel.id,
      {
        connected: false,
        platform: channel.platform,
        expiresAt: null,
        scope: null
      }
    ])
  ) as Record<string, ChannelAuthStatus>;

  if (channels.length === 0) {
    return baseMap;
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("channel_auth_tokens")
    .select("channel_id, platform, refresh_token, access_token, expires_at, scope")
    .in(
      "channel_id",
      channels.map((channel) => channel.id)
    );

  if (error) {
    throw error;
  }

  for (const record of data as Array<{
    channel_id: string;
    platform: PlatformKey;
    refresh_token: string | null;
    access_token: string | null;
    expires_at: string | null;
    scope: string | null;
  }>) {
    baseMap[record.channel_id] = {
      connected: Boolean(record.refresh_token || record.access_token),
      platform: record.platform,
      expiresAt: record.expires_at,
      scope: record.scope
    };
  }

  return baseMap;
}

export async function getTikTokChannelCredentials(
  channelId: string
): Promise<TikTokChannelCredentials | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("channel_auth_tokens")
    .select(
      "channel_id, platform, external_user_id, access_token, refresh_token, scope, token_type, expires_at, refresh_expires_at"
    )
    .eq("channel_id", channelId)
    .eq("platform", "tiktok")
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const record = data as ChannelAuthTokenRecord;

  return {
    channelId: record.channel_id,
    platform: "tiktok",
    externalUserId: record.external_user_id,
    accessToken: record.access_token,
    refreshToken: record.refresh_token,
    scope: record.scope,
    tokenType: record.token_type,
    expiresAt: record.expires_at,
    refreshExpiresAt: record.refresh_expires_at
  };
}

export async function upsertTikTokChannelCredentials(
  input: UpsertTikTokChannelCredentialsInput
) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("channel_auth_tokens").upsert(
    {
      channel_id: input.channelId,
      platform: "tiktok",
      external_user_id: input.externalUserId ?? null,
      access_token: input.accessToken ?? null,
      refresh_token: input.refreshToken ?? null,
      scope: input.scope ?? null,
      token_type: input.tokenType ?? null,
      expires_at: input.expiresAt ?? null,
      refresh_expires_at: input.refreshExpiresAt ?? null
    },
    {
      onConflict: "channel_id"
    }
  );

  if (error) {
    throw error;
  }
}
