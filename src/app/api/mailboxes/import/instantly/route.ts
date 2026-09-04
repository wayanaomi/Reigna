import { NextResponse } from "next/server";
import { getOwnerId } from "@/lib/auth/session";
import { sendingService } from "@/lib/services/sending";

export async function POST(request: Request) {
  try {
    const ownerId = await getOwnerId();

    if (!ownerId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const email =
      typeof body?.email === "string"
        ? body.email.trim()
        : "";

    if (!email) {
      return NextResponse.json(
        { error: "Mailbox email is required." },
        { status: 400 }
      );
    }

    const senderIdentity =
      await sendingService.importInstantlyMailbox(
        ownerId,
        email
      );

    return NextResponse.json(
      {
        item: senderIdentity,
        message: "Instantly mailbox imported successfully.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "[POST /api/mailboxes/import/instantly]",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unable to import the Instantly mailbox.";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}