import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    status: "ok",
    service: "sns-dashboard",
    timestamp: new Date().toISOString()
  });
}
