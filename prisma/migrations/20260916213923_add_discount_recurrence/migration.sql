-- Recurring coupon activation windows (see prisma/schema.prisma comment on Discount)
ALTER TABLE "discounts" ADD COLUMN "isRecurring" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "discounts" ADD COLUMN "recurrenceType" TEXT;
ALTER TABLE "discounts" ADD COLUMN "recurrenceDaysOfWeek" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];
ALTER TABLE "discounts" ADD COLUMN "recurrenceDayOfMonth" INTEGER;
ALTER TABLE "discounts" ADD COLUMN "recurrenceStartTime" TEXT;
ALTER TABLE "discounts" ADD COLUMN "recurrenceEndTime" TEXT;
