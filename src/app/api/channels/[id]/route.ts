import { NextResponse } from "next/server";
import {
  deleteManagedChannel,
  updateManagedChannelAlias
} from "@/lib/dashboard-store";
import { parseManagedChannelAliasInput } from "@/lib/dashboard-validation";
import { hasSupabaseServerEnv } from "@/lib/supabase";

interface ChannelRouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function PATCH(request: Request, context: ChannelRouteContext) {
  if (!hasSupabaseServerEnv()) {
    return notConfiguredResponse();
  }

  const body = (await request.json().catch(() => null)) as unknown;
  const input = parseManagedChannelAliasInput(body);

  if (!input) {
    return NextResponse.json(
      {
        message: "Invalid channel alias payload."
      },
      {
        status: 400
      }
    );
  }

  try {
    const { id } = await context.params;
    const channel = await updateManagedChannelAlias(id, input);

    return NextResponse.json({
      channel
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Failed to update managed channel."
      },
      {
        status: 500
      }
    );
  }
}

export async function DELETE(_: Request, context: ChannelRouteContext) {
  if (!hasSupabaseServerEnv()) {
    return notConfiguredResponse();
  }

  try {
    const { id } = await context.params;
    await deleteManagedChannel(id);

    return NextResponse.json({
      success: true
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Failed to delete managed channel."
      },
      {
        status: 500
      }
    );
  }
}

function notConfiguredResponse() {
  return NextResponse.json(
    {
      message: "Supabase is not configured."
    },
    {
      status: 503
    }
  );
}
