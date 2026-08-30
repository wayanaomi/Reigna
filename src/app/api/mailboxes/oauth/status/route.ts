import { NextRequest, NextResponse } from "next/server";
import { getOwnerId } from "@/lib/auth/session";
import { sendingService } from "@/lib/services/sending";

export async function GET(request: NextRequest) {
  const ownerId = await getOwnerId();
  if (!ownerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sessionId = request.nextUrl.searchParams.get("sessionId");
  if (!sessionId) return NextResponse.json({ error: "sessionId is required." }, { status: 400 });

  try {
    const result = await sendingService.checkMailboxConnection(ownerId, sessionId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 422 });
  }
}
