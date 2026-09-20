-- CreateTable
CREATE TABLE "content_pages" (
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "intro" TEXT,
    "lastUpdated" TEXT,
    "sections" JSONB NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_pages_pkey" PRIMARY KEY ("slug")
);
