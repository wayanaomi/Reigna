import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma, isDatabaseConfigured } from "@/lib/db";

/**
 * Auth.js configuration for Reigna's single-operator authentication.
 *
 * v1 has exactly one owner per deployment. There is no public sign-up
 * screen — the first account is created via a one-time bootstrap flow
 * (see /app/login/actions.ts) that only succeeds while zero User rows
 * exist. Every authenticated session carries the owner's User.id, which
 * every service call uses to scope its database queries (see
 * /docs/PRODUCT_DECISIONS.md — owner isolation).
 *
 * Uses JWT sessions (no Session/Account tables) since Credentials-based
 * auth doesn't need a database session store, and it keeps this file free
 * of edge-runtime constraints that would otherwise force a split
 * edge/node config (see /memories/nextjs-patterns.md).
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = typeof credentials?.email === "string" ? credentials.email.trim().toLowerCase() : "";
        const password = typeof credentials?.password === "string" ? credentials.password : "";
        if (!email || !password) return null;
        if (!isDatabaseConfigured || !prisma) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name ?? undefined };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) token.uid = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && typeof token.uid === "string") {
        session.user.id = token.uid;
      }
      return session;
    },
  },
});
