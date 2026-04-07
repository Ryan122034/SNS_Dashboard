import { NextResponse } from "next/server";
import { createWorkHistory } from "@/lib/dashboard-store";
import { hasSupabaseServerEnv } from "@/lib/supabase";
import { parseWorkHistoryInput } from "@/lib/dashboard-validation";

export async function POST(request: Request) {
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

  const body = (await request.json().catch(() => null)) as unknown;
  const input = parseWorkHistoryInput(body);

  if (!input) {
    return NextResponse.json(
      {
        message: "Invalid work history payload."
      },
      {
        status: 400
      }
    );
  }

  try {
    const workHistory = await createWorkHistory(input);
    return NextResponse.json(
      {
        workHistory
      },
      {
        status: 201
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Failed to create work history."
      },
      {
        status: 500
      }
    );
  }
}
