import { NextRequest, NextResponse } from "next/server";
import { getOwnerId } from "@/lib/auth/session";
import { launchCampaign } from "@/lib/services/campaigns/launch";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ownerId = await getOwnerId();
  if (!ownerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const result = await launchCampaign(ownerId, id);
  if (!result.ok) return NextResponse.json(result, { status: 422 });
  return NextResponse.json(result);
}
