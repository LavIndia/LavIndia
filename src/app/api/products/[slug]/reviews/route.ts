import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

async function resolveProductId(slug: string) {
  const product = await prisma.product.findFirst({
    where: { OR: [{ slug }, { id: slug }] },
    select: { id: true },
  });
  return product?.id ?? null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const productId = await resolveProductId(slug);

  if (!productId) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const reviews = await prisma.review.findMany({
    where: { productId },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true, profilePicture: true } } },
  });

  const count = reviews.length;
  const average =
    count === 0
      ? 0
      : Math.round(
          (reviews.reduce((sum, r) => sum + r.rating, 0) / count) * 10
        ) / 10;

  return NextResponse.json({
    reviews: reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      isVerifiedPurchase: r.isVerifiedPurchase,
      createdAt: r.createdAt,
      userName: r.user.name || "Anonymous",
    })),
    average,
    count,
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Please sign in to write a review" },
      { status: 401 }
    );
  }

  const { slug } = await params;
  const productId = await resolveProductId(slug);
  if (!productId) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const rating = Number(body?.rating);
  const comment = typeof body?.comment === "string" ? body.comment.trim() : "";

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json(
      { error: "Rating must be between 1 and 5" },
      { status: 400 }
    );
  }
  if (!comment || comment.length > 2000) {
    return NextResponse.json(
      { error: "Please write a comment (max 2000 characters)" },
      { status: 400 }
    );
  }

  const hasPurchased = await prisma.orderItem.findFirst({
    where: { productId, order: { userId: session.user.id } },
    select: { id: true },
  });

  const review = await prisma.review.upsert({
    where: {
      productId_userId: { productId, userId: session.user.id },
    },
    update: { rating, comment, isVerifiedPurchase: !!hasPurchased },
    create: {
      productId,
      userId: session.user.id,
      rating,
      comment,
      isVerifiedPurchase: !!hasPurchased,
    },
  });

  return NextResponse.json({ success: true, review });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const productId = await resolveProductId(slug);
  if (!productId) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const reviewId = request.nextUrl.searchParams.get("reviewId");
  if (!reviewId) {
    return NextResponse.json({ error: "reviewId is required" }, { status: 400 });
  }

  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { id: true, productId: true },
  });
  if (!review || review.productId !== productId) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }

  await prisma.review.delete({ where: { id: reviewId } });

  return NextResponse.json({ success: true });
}
