import { NextResponse } from "next/server";
import {
  createFirebaseSession,
  clearFirebaseSession,
} from "@/lib/firebase/session";
import { prisma, isDatabaseConfigured } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (!isDatabaseConfigured || !prisma) {
      return NextResponse.json(
        { error: "Database is not connected." },
        { status: 503 }
      );
    }

    const body = await request.json();

    const idToken =
      typeof body?.idToken === "string"
        ? body.idToken.trim()
        : "";

    if (!idToken) {
      return NextResponse.json(
        { error: "Firebase ID token is required." },
        { status: 400 }
      );
    }

    const decodedToken = await createFirebaseSession(idToken);

    const email =
      decodedToken.email?.trim().toLowerCase();

    if (!email) {
      await clearFirebaseSession();

      return NextResponse.json(
        {
          error:
            "Firebase account does not have an email address.",
        },
        { status: 400 }
      );
    }

    /*
     * Resolve the Firebase identity through the identity table.
     *
     * This allows multiple Firebase authentication providers
     * to belong to the same Reigna owner.
     *
     * Example:
     *   test@gmail.com       → password
     *   naomiwayabsc@gmail.com → google.com
     *
     * Both can resolve to the same User.
     */
    const firebaseIdentity =
      await prisma.firebaseIdentity.findUnique({
        where: {
          uid: decodedToken.uid,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });

    if (!firebaseIdentity) {
      await clearFirebaseSession();

      return NextResponse.json(
        {
          error:
            "This Firebase account is not authorized for Reigna.",
        },
        { status: 403 }
      );
    }

    const user = firebaseIdentity.user;

    /*
     * Verify that the Firebase identity's stored email
     * matches the verified Firebase token email.
     */
    if (
      firebaseIdentity.email.trim().toLowerCase() !== email
    ) {
      await clearFirebaseSession();

      return NextResponse.json(
        {
          error:
            "Firebase account email does not match its registered identity.",
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error(
      "Firebase session creation failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to create a Reigna session.",
      },
      { status: 401 }
    );
  }
}

export async function DELETE() {
  try {
    await clearFirebaseSession();

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Firebase session deletion failed:",
      error
    );

    return NextResponse.json(
      { error: "Unable to sign out." },
      { status: 500 }
    );
  }
}