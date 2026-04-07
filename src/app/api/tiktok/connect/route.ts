import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient, hasSupabaseServerEnv } from "@/lib/supabase";
import { buildTikTokAuthorizeUrl, hasTikTokOAuthEnv } from "@/lib/tiktok-oauth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!hasSupabaseServerEnv()) {
    return NextResponse.json(
      {
        message: "Supabase is not configured."
      },
      {
        status: 503
      }
    );
  }

  if (!hasTikTokOAuthEnv()) {
    return NextResponse.json(
      {
        message: "TikTok OAuth is not configured."
      },
      {
        status: 503
      }
    );
  }

  const channelId = request.nextUrl.searchParams.get("channelId")?.trim();

  if (!channelId) {
    return NextResponse.json(
      {
        message: "channelId is required."
      },
      {
        status: 400
      }
    );
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("managed_channels")
    .select("id, platform")
    .eq("id", channelId)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      {
        message: error.message
      },
      {
        status: 500
      }
    );
  }

  if (!data || data.platform !== "tiktok") {
    return NextResponse.json(
      {
        message: "TikTok managed channel not found."
      },
      {
        status: 404
      }
    );
  }

  const authorizeUrl = buildTikTokAuthorizeUrl(request.url, channelId);
  return NextResponse.redirect(authorizeUrl);
}
