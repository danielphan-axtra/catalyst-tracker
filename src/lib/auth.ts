import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
    CredentialsProvider({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });
        if (!user?.passwordHash) return null;
        const ok = await compare(credentials.password, user.passwordHash);
        if (!ok) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          hasPaidAccess: user.hasPaidAccess,
        };
      },
    }),
  ],
  pages: {
    signIn: "/signin",
    error: "/signin",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "credentials") return true;
      if (!user.email) return false;
      const existing = await prisma.user.findUnique({
        where: { email: user.email },
      });
      if (existing) return true;
      await prisma.user.create({
        data: {
          email: user.email,
          name: user.name ?? null,
          hasPaidAccess: false,
        },
      });
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        const email = user.email ?? token.email ?? null;
        token.email = email ?? token.email;
        const userHasPaidAccess = (user as { hasPaidAccess?: boolean }).hasPaidAccess;

        // OAuth providers (e.g. Google) do not include app-specific fields like hasPaidAccess.
        // Always resolve from DB when possible so Pro access is reflected correctly in session.
        if (email) {
          const dbUser = await prisma.user.findUnique({
            where: { email },
          });
          if (dbUser) {
            token.id = dbUser.id;
            token.hasPaidAccess = dbUser.hasPaidAccess;
          } else {
            token.id = user.id;
            token.hasPaidAccess = userHasPaidAccess ?? false;
          }
        } else {
          token.id = user.id;
          token.hasPaidAccess = userHasPaidAccess ?? false;
        }
      }
      if (trigger === "update" && session?.hasPaidAccess !== undefined) {
        token.hasPaidAccess = session.hasPaidAccess;
      }
      if (!token.id && token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.hasPaidAccess = dbUser.hasPaidAccess;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.hasPaidAccess = (token.hasPaidAccess as boolean) ?? false;
      }
      return session;
    },
  },
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  secret: process.env.NEXTAUTH_SECRET,
};
