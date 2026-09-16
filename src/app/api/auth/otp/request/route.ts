import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requestOtp } from "@/lib/otp-store";

const schema = z.object({
  identifier: z.string().min(1, "Email or mobile is required"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = schema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0].message },
        { status: 400 }
      );
    }

    const { identifier } = validated.data;
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
    const user = await prisma.user.findFirst({
      where: isEmail ? { email: identifier } : { mobile: identifier },
    });

    // Always respond the same way whether or not the account exists, so the
    // endpoint can't be used to enumerate registered emails/mobiles.
    if (user) {
      requestOtp(identifier);
    }

    return NextResponse.json({
      message: "If an account exists, an OTP has been sent.",
    });
  } catch (error) {
    console.error("OTP request error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
