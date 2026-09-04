import { NextRequest, NextResponse } from "next/server";
import { processScheduledCampaigns } from "@/lib/services/campaigns/scheduler";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json(
      {
        error: "CRON_SECRET is not configured.",
      },
      { status: 503 }
    );
  }

  const authorization =
    request.headers.get("authorization");

  if (authorization !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      {
        error: "Unauthorized.",
      },
      { status: 401 }
    );
  }

  try {
    const result =
      await processScheduledCampaigns();

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Scheduler failed.",
      },
      { status: 500 }
    );
  }
}