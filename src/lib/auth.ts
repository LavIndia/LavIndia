import NextAuth, { DefaultSession } from "next-auth";
import type { Adapter } from "next-auth/adapters";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getDeviceInfoFromHeaders } from "@/lib/device-info";
import { verifyOtp } from "@/lib/otp-store";

// Extend the session types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      mobile?: string | null;
      username?: string | null;
      role: "ADMIN" | "CUSTOMER";
    } & DefaultSession["user"];
  }

  interface User {
    role: "ADMIN" | "CUSTOMER";
    mobile?: string | null;
    username?: string | null;
  }
}

async function recordLoginEvent(
  userId: string,
  source?: { headers: Headers } | Request
) {
  try {
    const headers = source?.headers;
    if (!headers) return;
    const info = getDeviceInfoFromHeaders(headers);
    await prisma.loginEvent.create({
      data: {
        userId,
        ipAddress: info.ipAddress,
        userAgent: info.userAgent,
        browser: info.browser,
        os: info.os,
        deviceType: info.deviceType,
        city: info.city,
        region: info.region,
        country: info.country,
      },
    });
  } catch (error) {
    // Never block a login because device-info logging failed
    console.error("Failed to record login event:", error);
  }
}

const loginSchema = z.object({
  identifier: z.string().min(1, "Email or mobile is required"), // Can be email or mobile
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const otpLoginSchema = z.object({
  identifier: z.string().min(1, "Email or mobile is required"),
  otp: z.string().length(6, "Enter the 6-digit code"),
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
      async authorize(credentials, request) {
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

        await recordLoginEvent(user.id, request);

        // Return complete user data to avoid extra DB queries in JWT callback
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.profilePicture,
          role: user.role,
          mobile: user.mobile,
          username: user.username,
        };
      },
    }),
    // OTP login. See src/lib/otp-store.ts — fully wired end-to-end, but OTP
    // delivery has no SMS/email provider configured yet, so real users
    // cannot currently complete this flow. Kept live intentionally.
    Credentials({
      id: "otp",
      name: "OTP",
      credentials: {
        identifier: { label: "Email or Mobile", type: "text" },
        otp: { label: "OTP", type: "text" },
      },
      async authorize(credentials, request) {
        const validatedFields = otpLoginSchema.safeParse(credentials);
        if (!validatedFields.success) {
          throw new Error("Invalid OTP request");
        }

        const { identifier, otp } = validatedFields.data;
        const result = verifyOtp(identifier, otp);
        if (!result.ok) {
          const messages: Record<string, string> = {
            not_requested: "Request an OTP first",
            expired: "OTP expired, please request a new one",
            too_many_attempts: "Too many attempts, please request a new OTP",
            invalid: "Incorrect OTP",
          };
          throw new Error(messages[result.reason] || "Incorrect OTP");
        }

        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
        const user = await prisma.user.findFirst({
          where: isEmail ? { email: identifier } : { mobile: identifier },
        });

        if (!user) {
          throw new Error("No account found for this email/mobile");
        }

        await recordLoginEvent(user.id, request);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.profilePicture,
          role: user.role,
          mobile: user.mobile,
          username: user.username,
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
        token.username = user.username ?? null;
        token.picture = user.image ?? null;

        // For OAuth sign-ins, fetch user from database if needed
        if (account?.provider === "google") {
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { mobile: true, username: true, profilePicture: true, role: true },
          });

          if (dbUser) {
            token.mobile = dbUser.mobile;
            token.username = dbUser.username;
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
        session.user.username = token.username as string | null;
        session.user.image = token.picture as string | null;
        session.user.role = token.role as "ADMIN" | "CUSTOMER";
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      // For Google OAuth, verify email is verified
      if (account?.provider === "google") {
        const googleProfile = profile as { email_verified?: boolean };
        if (googleProfile.email_verified === false) {
          return false; // Reject unverified Google emails
        }

        if (user.id) {
          const { headers } = await import("next/headers");
          await recordLoginEvent(user.id, { headers: await headers() });
        }
      }

      // Allow all other sign-ins
      return true;
    },
  },
});
