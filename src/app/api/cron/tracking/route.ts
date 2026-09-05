import { NextRequest, NextResponse } from "next/server";
import { syncInstantlyTracking } from "@/lib/services/tracking/sync";

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured." },
      { status: 500 }
    );
  }

  const authorization = request.headers.get("authorization");

  if (authorization !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401 }
    );
  }

  try {
    const result = await syncInstantlyTracking();

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    console.error(
      "[cron/tracking] failed",
      error instanceof Error ? error.message : "Unknown error"
    );

    return NextResponse.json(
      { error: "Tracking sync failed." },
      { status: 500 }
    );
  }
}