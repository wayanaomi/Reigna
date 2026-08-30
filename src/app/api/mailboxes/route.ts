import { NextResponse } from "next/server";
import { getOwnerId } from "@/lib/auth/session";
import { sendingService } from "@/lib/services/sending";

export async function GET() {
  const ownerId = await getOwnerId();
  if (!ownerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await sendingService.listSenderIdentities(ownerId);
  return NextResponse.json(result);
}
