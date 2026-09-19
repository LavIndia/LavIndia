-- AlterTable
ALTER TABLE "site_settings" ALTER COLUMN "businessName" SET DEFAULT 'lavindia',
ALTER COLUMN "copyrightText" SET DEFAULT '© 2025 lavindia. All rights reserved.';

-- CreateTable
CREATE TABLE "newsletter_subscribers" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "newsletter_subscribers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "newsletter_subscribers_email_key" ON "newsletter_subscribers"("email");
