import { NextRequest, NextResponse } from "next/server";
import { getKstDateString, isSundayInKst } from "@/lib/kst-time";
import { syncDailyPostStatusPlatforms } from "@/lib/dashboard-store";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function isAuthorized(request: NextRequest) {
  const token = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return false;
  }

  return token === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        status: "unauthorized"
      },
      {
        status: 401
      }
    );
  }

  const syncDate = getKstDateString();

  if (isSundayInKst()) {
    return NextResponse.json({
      status: "skipped",
      syncDate,
      reason: "Sunday 00:00 KST is excluded from the daily post sync."
    });
  }

  try {
    const result = await syncDailyPostStatusPlatforms(syncDate);

    return NextResponse.json({
      status: "ok",
      ...result
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Daily post sync failed.";

    return NextResponse.json(
      {
        status: "error",
        syncDate,
        message
      },
      {
        status: 500
      }
    );
  }
}
