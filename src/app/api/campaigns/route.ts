import { NextRequest, NextResponse } from "next/server";
import { getOwnerId } from "@/lib/auth/session";
import { campaignsService } from "@/lib/services/campaigns";
import { generateDraftsForCampaign } from "@/lib/services/pipeline";

export async function GET() {
  const ownerId = await getOwnerId();
  if (!ownerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await campaignsService.list(ownerId);
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const ownerId = await getOwnerId();
  if (!ownerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const senderIdentityId = typeof body?.senderIdentityId === "string" ? body.senderIdentityId : "";
  const contactIds = Array.isArray(body?.contactIds) ? body.contactIds.filter((c: unknown) => typeof c === "string") : [];

  if (!name || !senderIdentityId || contactIds.length === 0) {
    return NextResponse.json({ error: "name, senderIdentityId, and at least one contactId are required." }, { status: 400 });
  }

  const campaign = await campaignsService.create(ownerId, {
    name,
    senderIdentityId,
    contactIds,
    followUpEnabled: body?.followUpEnabled ?? true,
    followUpDelayDays: body?.followUpDelayDays ?? 4,
  });

  const draftResult = await generateDraftsForCampaign(ownerId, campaign.id);

  return NextResponse.json({ campaign, draftResult });
}
