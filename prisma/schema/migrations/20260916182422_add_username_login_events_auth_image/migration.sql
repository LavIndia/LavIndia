-- Add optional authImagePath to site_settings (admin-editable login/signup background)
ALTER TABLE "site_settings" ADD COLUMN "authImagePath" TEXT;

-- Add username as a nullable column first, backfill, then enforce NOT NULL + UNIQUE.
ALTER TABLE "users" ADD COLUMN "username" TEXT;

-- Backfill existing users from the local-part of their email (or "user" for mobile-only
-- accounts), lowercased and stripped of characters outside [a-z0-9_], de-duplicated by
-- appending the row's numeric suffix when a collision would occur.
WITH base AS (
  SELECT
    id,
    ROW_NUMBER() OVER (ORDER BY "createdAt") AS rn,
    LOWER(REGEXP_REPLACE(COALESCE(SPLIT_PART(email, '@', 1), 'user'), '[^a-z0-9_]', '', 'g')) AS candidate
  FROM "users"
),
numbered AS (
  SELECT
    id,
    candidate,
    ROW_NUMBER() OVER (PARTITION BY candidate ORDER BY rn) AS dup_rank,
    rn
  FROM base
)
UPDATE "users" u
SET "username" = CASE
  WHEN n.dup_rank = 1 AND LENGTH(n.candidate) >= 3 THEN n.candidate
  WHEN LENGTH(n.candidate) >= 3 THEN n.candidate || n.rn::text
  ELSE 'user' || n.rn::text
END
FROM numbered n
WHERE u.id = n.id;

ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL;
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- Login history / device info for the "Active Sessions" page
CREATE TABLE "login_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "deviceType" TEXT,
    "city" TEXT,
    "region" TEXT,
    "country" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "login_events_userId_createdAt_idx" ON "login_events"("userId", "createdAt");

ALTER TABLE "login_events" ADD CONSTRAINT "login_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
