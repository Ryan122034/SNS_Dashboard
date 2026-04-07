import { NextResponse } from "next/server";
import { deleteWorkHistory, updateWorkHistory } from "@/lib/dashboard-store";
import { hasSupabaseServerEnv } from "@/lib/supabase";
import { parseWorkHistoryInput } from "@/lib/dashboard-validation";

interface WorkHistoryRouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function PATCH(request: Request, context: WorkHistoryRouteContext) {
  if (!hasSupabaseServerEnv()) {
    return notConfiguredResponse();
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
    const { id } = await context.params;
    const workHistory = await updateWorkHistory(id, input);

    return NextResponse.json({
      workHistory
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Failed to update work history."
      },
      {
        status: 500
      }
    );
  }
}

export async function DELETE(_: Request, context: WorkHistoryRouteContext) {
  if (!hasSupabaseServerEnv()) {
    return notConfiguredResponse();
  }

  try {
    const { id } = await context.params;
    await deleteWorkHistory(id);

    return NextResponse.json({
      success: true
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Failed to delete work history."
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
