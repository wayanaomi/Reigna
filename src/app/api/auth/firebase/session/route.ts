import { NextResponse } from "next/server";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";

export async function POST(req: Request) {
  try {
    if (!isDatabaseConfigured || !prisma) {
      return NextResponse.json(
        { error: "Database is not configured." },
        { status: 503 }
      );
    }

    const body = await req.json();
    const idToken = body?.idToken;

    if (!idToken || typeof idToken !== "string") {
      return NextResponse.json(
        { error: "Firebase ID token is required." },
        { status: 400 }
      );
    }

    const adminAuth = getFirebaseAdminAuth();

    const decodedToken = await adminAuth.verifyIdToken(idToken);

    const uid = decodedToken.uid;
    const email = decodedToken.email ?? null;
    const name =
      decodedToken.name ??
      email?.split("@")[0] ??
      "Reigna User";

    if (!email) {
      return NextResponse.json(
        {
          error:
            "Your Firebase account does not have an email address.",
        },
        { status: 400 }
      );
    }

    /*
     * Find the Firebase identity first.
     */
    let identity = await prisma.firebaseIdentity.findUnique({
      where: {
        uid,
      },
      include: {
        user: true,
      },
    });

    /*
     * If this Firebase identity does not exist yet,
     * provision it into Reigna.
     */
    if (!identity) {
      /*
       * First check whether a Reigna account already
       * exists with this email.
       */
      let user = await prisma.user.findUnique({
        where: {
          email,
        },
      });

      /*
       * Create a new Reigna user for a completely
       * new Firebase account.
       */
      if (!user) {
        user = await prisma.user.create({
          data: {
            email,
            name,
          },
        });
      }

      /*
       * Connect the Firebase identity to the Reigna user.
       */
      identity = await prisma.firebaseIdentity.create({
        data: {
          uid,
          email,
          provider:
            decodedToken.firebase?.sign_in_provider ?? "unknown",
          userId: user.id,
        },
        include: {
          user: true,
        },
      });
    }

    /*
     * Create the Firebase session cookie.
     */
    const sessionCookie = await adminAuth.createSessionCookie(
      idToken,
      {
        expiresIn: 1000 * 60 * 60 * 24 * 5,
      }
    );

    const response = NextResponse.json({
      ok: true,
      user: {
        id: identity.user.id,
        email: identity.user.email,
        name: identity.user.name,
      },
    });

    response.cookies.set("reigna_session", sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 5,
    });

    return response;
  } catch (error) {
    console.error("Firebase session error:", error);

    return NextResponse.json(
      {
        error: "Authentication failed.",
      },
      {
        status: 401,
      }
    );
  }
}