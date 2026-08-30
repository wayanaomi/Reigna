import { NextRequest, NextResponse } from "next/server";
import { getOwnerId } from "@/lib/auth/session";
import { reviewService } from "@/lib/services/review";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ownerId = await getOwnerId();
  if (!ownerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await reviewService.approve(ownerId, id);
  return NextResponse.json({ ok: true });
}
