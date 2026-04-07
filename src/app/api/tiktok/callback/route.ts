import { NextRequest, NextResponse } from "next/server";
import { upsertTikTokChannelCredentials } from "@/lib/channel-auth-store";
import { syncTikTokChannelPosts } from "@/lib/dashboard-store";
import { createSupabaseAdminClient, hasSupabaseServerEnv } from "@/lib/supabase";
import {
  exchangeTikTokAuthorizationCode,
  hasTikTokOAuthEnv,
  verifyTikTokOAuthState
} from "@/lib/tiktok-oauth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const redirectUrl = new URL("/", request.url);

  if (!hasSupabaseServerEnv() || !hasTikTokOAuthEnv()) {
    redirectUrl.searchParams.set("tiktok", "config-error");
    return NextResponse.redirect(redirectUrl);
  }

  const code = request.nextUrl.searchParams.get("code")?.trim();
  const state = request.nextUrl.searchParams.get("state")?.trim();
  const error = request.nextUrl.searchParams.get("error")?.trim();

  if (error) {
    redirectUrl.searchParams.set("tiktok", "denied");
    return NextResponse.redirect(redirectUrl);
  }

  if (!code || !state) {
    redirectUrl.searchParams.set("tiktok", "invalid-callback");
    return NextResponse.redirect(redirectUrl);
  }

  try {
    const { channelId } = verifyTikTokOAuthState(state);
    const supabase = createSupabaseAdminClient();
    const { data: channel, error: channelError } = await supabase
      .from("managed_channels")
      .select("id, platform, url")
      .eq("id", channelId)
      .maybeSingle();

    if (channelError) {
      throw channelError;
    }

    if (!channel || channel.platform !== "tiktok") {
      throw new Error("TikTok managed channel not found.");
    }

    const tokenData = await exchangeTikTokAuthorizationCode(request.url, code);

    await upsertTikTokChannelCredentials({
      channelId,
      externalUserId: tokenData.externalUserId,
      accessToken: tokenData.accessToken,
      refreshToken: tokenData.refreshToken,
      scope: tokenData.scope,
      tokenType: tokenData.tokenType,
      expiresAt: tokenData.expiresAt,
      refreshExpiresAt: tokenData.refreshExpiresAt
    });

    try {
      await syncTikTokChannelPosts(channelId, channel.url);
      redirectUrl.searchParams.set("tiktok", "connected");
    } catch {
      redirectUrl.searchParams.set("tiktok", "connected-sync-pending");
    }

    redirectUrl.searchParams.set("channelId", channelId);
    return NextResponse.redirect(redirectUrl);
  } catch {
    redirectUrl.searchParams.set("tiktok", "callback-error");
    return NextResponse.redirect(redirectUrl);
  }
}
