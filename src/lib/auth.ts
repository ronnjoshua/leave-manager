import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import {
  users,
  accounts,
  sessions,
  verificationTokens,
  allowedUsers,
} from "@/lib/db/schema";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    GitHub({ allowDangerousEmailAccountLinking: true }),
    Google({ allowDangerousEmailAccountLinking: true }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      const [allowed] = await db
        .select()
        .from(allowedUsers)
        .where(eq(allowedUsers.email, user.email));
      return !!allowed;
    },
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
});

/**
 * Check if a user email is an admin.
 */
export async function isAdmin(email: string): Promise<boolean> {
  const [row] = await db
    .select()
    .from(allowedUsers)
    .where(eq(allowedUsers.email, email));
  return row?.isAdmin ?? false;
}
