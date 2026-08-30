import { NextRequest, NextResponse } from "next/server";
import { getOwnerId } from "@/lib/auth/session";
import { researchService } from "@/lib/services/research";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ownerId = await getOwnerId();
  if (!ownerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const outcome = await researchService.researchContact(ownerId, id);
  return NextResponse.json(outcome);
}
