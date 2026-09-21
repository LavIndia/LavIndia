-- Highlights: the house's own moments — expos, pop-ups, awards, press.
--
-- New table only; nothing existing is touched. `mediaType` is a plain text
-- column rather than a Postgres enum so that adding a third kind of media
-- later is a code change rather than a migration.
CREATE TABLE "highlights" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "place" TEXT,
    "happenedOn" TIMESTAMP(3),
    "kind" TEXT,
    "mediaType" TEXT NOT NULL DEFAULT 'IMAGE',
    "mediaUrl" TEXT NOT NULL,
    "posterUrl" TEXT,
    "linkUrl" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "highlights_pkey" PRIMARY KEY ("id")
);

-- The storefront's only query is "active highlights in order".
CREATE INDEX "highlights_isActive_order_idx" ON "highlights"("isActive", "order");
