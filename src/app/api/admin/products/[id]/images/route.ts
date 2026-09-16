import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const imageSchema = z.object({
  url: z
    .string()
    .refine(
      (value) => value.startsWith("/") || /^https?:\/\//.test(value),
      "Image URL must be a public path or absolute URL",
    ),
  alt: z.string().optional().nullable(),
  isPrimary: z.boolean().default(false),
  position: z.number().int().min(0).default(0),
});

// POST /api/admin/products/[id]/images - Add new image
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const validatedData = imageSchema.parse(body);

    const image = await prisma.productImage.create({
      data: {
        ...validatedData,
        productId: id,
      },
    });

    revalidateTag("products");

    return NextResponse.json(image, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to add image" }, { status: 500 });
  }
}
