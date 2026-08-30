import { NextRequest, NextResponse } from "next/server";
import { getOwnerId } from "@/lib/auth/session";
import { sendingService } from "@/lib/services/sending";

async function connect(request: NextRequest, provider: "google" | "microsoft") {
  const ownerId = await getOwnerId();
  if (!ownerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const origin = request.nextUrl.origin;
  try {
    const { sessionId, authorizationUrl } = await sendingService.startMailboxConnection(
      ownerId,
      provider,
      `${origin}/mailboxes`
    );
    return NextResponse.json({ sessionId, authorizationUrl });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 422 });
  }
}

export async function POST(request: NextRequest) {
  return connect(request, "google");
}
