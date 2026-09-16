-- HeroBanner: optional date window + recurrence scheduling (see src/lib/scheduling.ts)
ALTER TABLE "hero_banners" ADD COLUMN "startDate" TIMESTAMP(3);
ALTER TABLE "hero_banners" ADD COLUMN "endDate" TIMESTAMP(3);
ALTER TABLE "hero_banners" ADD COLUMN "isRecurring" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "hero_banners" ADD COLUMN "recurrenceType" TEXT;
ALTER TABLE "hero_banners" ADD COLUMN "recurrenceDaysOfWeek" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];
ALTER TABLE "hero_banners" ADD COLUMN "recurrenceDayOfMonth" INTEGER;
ALTER TABLE "hero_banners" ADD COLUMN "recurrenceStartTime" TEXT;
ALTER TABLE "hero_banners" ADD COLUMN "recurrenceEndTime" TEXT;

-- PromoBanner: recurrence scheduling (date window already existed)
ALTER TABLE "promo_banners" ADD COLUMN "isRecurring" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "promo_banners" ADD COLUMN "recurrenceType" TEXT;
ALTER TABLE "promo_banners" ADD COLUMN "recurrenceDaysOfWeek" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];
ALTER TABLE "promo_banners" ADD COLUMN "recurrenceDayOfMonth" INTEGER;
ALTER TABLE "promo_banners" ADD COLUMN "recurrenceStartTime" TEXT;
ALTER TABLE "promo_banners" ADD COLUMN "recurrenceEndTime" TEXT;
