import { NextResponse } from "next/server";

import { getOwnerId } from "@/lib/auth/session";
import { sendingService } from "@/lib/services/sending";

export async function GET() {
  const ownerId = await getOwnerId();

  if (!ownerId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const accounts =
      await sendingService.listInstantlyAccounts();

    return NextResponse.json({
      items: accounts,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load Instantly accounts.";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}