import NextAuth, { DefaultSession } from "next-auth";
import type { Adapter } from "next-auth/adapters";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { z } from "zod";

// Extend the session types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      mobile?: string | null;
      role: "ADMIN" | "CUSTOMER";
    } & DefaultSession["user"];
  }

  interface User {
    role: "ADMIN" | "CUSTOMER";
    mobile?: string | null;
  }
}

const loginSchema = z.object({
  identifier: z.string().min(1, "Email or mobile is required"), // Can be email or mobile
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma) as Adapter,
  session: { strategy: "jwt" },
  trustHost: true,
  debug: false,
  pages: {
    signIn: "/", // Will show dialog on homepage
    error: "/api/auth/error", // Error page
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        identifier: { label: "Email or Mobile", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const validatedFields = loginSchema.safeParse(credentials);

        if (!validatedFields.success) {
          throw new Error("Invalid credentials format");
        }

        const { identifier, password } = validatedFields.data;

        // Better email detection using regex
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);

        const user = await prisma.user.findFirst({
          where: isEmail ? { email: identifier } : { mobile: identifier },
        });

        if (!user || !user.password) {
          throw new Error("Invalid email/mobile or password");
        }

        const passwordsMatch = await bcrypt.compare(password, user.password);

        if (!passwordsMatch) {
          throw new Error("Invalid email/mobile or password");
        }

        // Return complete user data to avoid extra DB queries in JWT callback
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.profilePicture,
          role: user.role,
          mobile: user.mobile,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      // On sign-in, populate token with user data
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.mobile = user.mobile ?? null;
        token.picture = user.image ?? null;

        // For OAuth sign-ins, fetch user from database if needed
        if (account?.provider === "google") {
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { mobile: true, profilePicture: true, role: true },
          });

          if (dbUser) {
            token.mobile = dbUser.mobile;
            token.picture = dbUser.profilePicture || token.picture;
            token.role = dbUser.role;
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.mobile = token.mobile as string | null;
        session.user.image = token.picture as string | null;
        session.user.role = token.role as "ADMIN" | "CUSTOMER";
      }
      return session;
    },
    async signIn({ account, profile }) {
      // For Google OAuth, verify email is verified
      if (account?.provider === "google") {
        const googleProfile = profile as { email_verified?: boolean };
        if (googleProfile.email_verified === false) {
          return false; // Reject unverified Google emails
        }
      }

      // Allow all other sign-ins
      return true;
    },
  },
});
