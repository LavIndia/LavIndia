import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const signupSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address").optional().nullable(),
    mobile: z
      .string()
      .regex(/^[0-9]{10}$/, "Mobile must be 10 digits")
      .optional()
      .nullable(),
    password: z.string().min(6, "Password must be at least 6 characters"),
  })
  .refine((data) => data.email || data.mobile, {
    message: "Either email or mobile is required",
    path: ["email"],
  });

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validatedFields = signupSchema.safeParse(body);

    if (!validatedFields.success) {
      return NextResponse.json(
        { error: validatedFields.error.errors[0].message },
        { status: 400 }
      );
    }

    const { name, email, mobile, password } = validatedFields.data;

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [email ? { email } : {}, mobile ? { mobile } : {}].filter(
          (obj) => Object.keys(obj).length > 0
        ),
      },
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return NextResponse.json(
          { error: "Email already registered" },
          { status: 400 }
        );
      }
      if (existingUser.mobile === mobile) {
        return NextResponse.json(
          { error: "Mobile number already registered" },
          { status: 400 }
        );
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email: email || null,
        mobile: mobile || null,
        password: hashedPassword,
      },
    });

    return NextResponse.json(
      {
        message: "User created successfully",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          mobile: user.mobile,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
