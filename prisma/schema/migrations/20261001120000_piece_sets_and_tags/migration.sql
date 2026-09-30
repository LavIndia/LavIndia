-- AlterTable
ALTER TABLE "products" ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "piece_sets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "match" TEXT NOT NULL DEFAULT 'ALL',
    "rules" JSONB NOT NULL DEFAULT '[]',
    "includeProductIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "excludeProductIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "piece_sets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "piece_sets_archivedAt_idx" ON "piece_sets"("archivedAt");

