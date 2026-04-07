import { NextRequest, NextResponse } from "next/server";

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

  return NextResponse.json({
    status: "queued",
    message:
      "Cron endpoint scaffold is ready. Connect platform clients and a database snapshot writer next."
  });
}
