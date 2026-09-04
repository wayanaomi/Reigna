import { NextRequest, NextResponse } from "next/server";
import { getOwnerId } from "@/lib/auth/session";
import { campaignsService } from "@/lib/services/campaigns";
import { generateDraftsForCampaign } from "@/lib/services/pipeline";

export async function GET() {
  const ownerId = await getOwnerId();

  if (!ownerId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const result = await campaignsService.list(ownerId);

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const ownerId = await getOwnerId();

  if (!ownerId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const body = await request.json().catch(() => null);

  const name =
    typeof body?.name === "string"
      ? body.name.trim()
      : "";

  const senderIdentityId =
    typeof body?.senderIdentityId === "string"
      ? body.senderIdentityId
      : "";

  const contactIds = Array.isArray(body?.contactIds)
    ? body.contactIds.filter(
        (contactId: unknown): contactId is string =>
          typeof contactId === "string"
      )
    : [];

  const followUpEnabled =
    typeof body?.followUpEnabled === "boolean"
      ? body.followUpEnabled
      : true;

  const followUpDelayDays =
    typeof body?.followUpDelayDays === "number"
      ? body.followUpDelayDays
      : 4;

  const scheduleEnabled =
    typeof body?.scheduleEnabled === "boolean"
      ? body.scheduleEnabled
      : false;

  const scheduledAt =
    typeof body?.scheduledAt === "string" &&
    body.scheduledAt.trim()
      ? body.scheduledAt
      : null;

  const timezone =
    typeof body?.timezone === "string" &&
    body.timezone.trim()
      ? body.timezone.trim()
      : "Africa/Lagos";

  if (
    !name ||
    !senderIdentityId ||
    contactIds.length === 0
  ) {
    return NextResponse.json(
      {
        error:
          "name, senderIdentityId, and at least one contactId are required.",
      },
      { status: 400 }
    );
  }

  if (followUpDelayDays < 1 || followUpDelayDays > 30) {
    return NextResponse.json(
      {
        error:
          "followUpDelayDays must be between 1 and 30.",
      },
      { status: 400 }
    );
  }

  let parsedScheduledAt: Date | null = null;

  if (scheduleEnabled) {
    if (!scheduledAt) {
      return NextResponse.json(
        {
          error:
            "scheduledAt is required when scheduling is enabled.",
        },
        { status: 400 }
      );
    }

    parsedScheduledAt = new Date(scheduledAt);

    if (Number.isNaN(parsedScheduledAt.getTime())) {
      return NextResponse.json(
        {
          error: "scheduledAt must be a valid date.",
        },
        { status: 400 }
      );
    }

    if (parsedScheduledAt.getTime() <= Date.now()) {
      return NextResponse.json(
        {
          error:
            "scheduledAt must be in the future.",
        },
        { status: 400 }
      );
    }
  }

  try {
  const scheduledAt =
  typeof body?.scheduledAt === "string" &&
  body.scheduledAt.trim()
    ? new Date(body.scheduledAt)
    : null;

if (
  scheduledAt &&
  Number.isNaN(scheduledAt.getTime())
) {
  return NextResponse.json(
    { error: "Invalid scheduledAt value." },
    { status: 400 }
  );
}

const campaign = await campaignsService.create(ownerId, {
  name,
  senderIdentityId,
  contactIds,

  followUpEnabled:
    body?.followUpEnabled ?? true,

  followUpDelayDays:
    body?.followUpDelayDays ?? 4,

  scheduleEnabled:
    body?.scheduleEnabled ?? false,

  scheduledAt,

  timezone:
    typeof body?.timezone === "string" &&
    body.timezone.trim()
      ? body.timezone.trim()
      : "Africa/Lagos",
});

    const draftResult =
      await generateDraftsForCampaign(
        ownerId,
        campaign.id
      );

    return NextResponse.json({
      campaign,
      draftResult,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to create campaign.",
      },
      { status: 422 }
    );
  }
}