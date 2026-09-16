import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const RESERVED_USERNAMES = new Set([
  "admin",
  "administrator",
  "root",
  "support",
  "lavindia",
  "help",
  "api",
]);

const signupSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(20, "Username must be at most 20 characters")
      .regex(
        /^[a-zA-Z0-9_]+$/,
        "Username can only contain letters, numbers, and underscores"
      )
      .refine((value) => !RESERVED_USERNAMES.has(value.toLowerCase()), {
        message: "This username is reserved, please choose another",
      }),
    email: z.string().email("Invalid email address").optional().nullable(),
    mobile: z
      .string()
      .regex(/^[0-9]{10}$/, "Mobile must be 10 digits")
      .optional()
      .nullable(),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[a-z]/, "Password must include a lowercase letter")
      .regex(/[A-Z]/, "Password must include an uppercase letter")
      .regex(/[0-9]/, "Password must include a number"),
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

    const { name, username, email, mobile, password } = validatedFields.data;

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          email ? { email } : {},
          mobile ? { mobile } : {},
        ].filter((obj) => Object.keys(obj).length > 0),
      },
    });

    if (existingUser) {
      if (existingUser.username.toLowerCase() === username.toLowerCase()) {
        return NextResponse.json(
          { error: "Username is already taken" },
          { status: 400 }
        );
      }
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
        username,
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
          username: user.username,
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
