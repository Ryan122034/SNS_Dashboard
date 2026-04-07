import { NextResponse } from "next/server";
import { createManagedChannel } from "@/lib/dashboard-store";
import { hasSupabaseServerEnv } from "@/lib/supabase";
import { parseManagedChannelInput } from "@/lib/dashboard-validation";

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
  const input = parseManagedChannelInput(body);

  if (!input) {
    return NextResponse.json(
      {
        message: "Invalid managed channel payload."
      },
      {
        status: 400
      }
    );
  }

  try {
    const channel = await createManagedChannel(input);
    return NextResponse.json(
      {
        channel
      },
      {
        status: 201
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        message: getErrorMessage(error)
      },
      {
        status: getErrorStatus(error)
      }
    );
  }
}

function getErrorMessage(error: unknown) {
  if (isDatabaseConflict(error)) {
    return "The same channel URL is already registered for this platform.";
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Failed to create managed channel.";
}

function getErrorStatus(error: unknown) {
  return isDatabaseConflict(error) ? 409 : 500;
}

function isDatabaseConflict(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return false;
  }

  return error.code === "23505";
}
