-- Snapshot of an applied coupon at order time (see prisma/schema.prisma comment on Order)
ALTER TABLE "orders" ADD COLUMN "discountCode" TEXT;
ALTER TABLE "orders" ADD COLUMN "discountCents" INTEGER NOT NULL DEFAULT 0;
