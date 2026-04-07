import { NextResponse } from "next/server";
import { hasSupabaseServerEnv } from "@/lib/supabase";

export function GET() {
  return NextResponse.json({
    status: "ok",
    service: "sns-dashboard",
    database: hasSupabaseServerEnv() ? "configured" : "fallback",
    timestamp: new Date().toISOString()
  });
}
