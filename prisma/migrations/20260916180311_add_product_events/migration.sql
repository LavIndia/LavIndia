-- CreateEnum
CREATE TYPE "ProductEventType" AS ENUM ('VIEW', 'ADD_TO_CART');

-- CreateTable
CREATE TABLE "product_events" (
    "id" TEXT NOT NULL,
    "type" "ProductEventType" NOT NULL,
    "sessionId" TEXT NOT NULL,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "productId" TEXT NOT NULL,

    CONSTRAINT "product_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_events_productId_type_idx" ON "product_events"("productId", "type");

-- AddForeignKey
ALTER TABLE "product_events" ADD CONSTRAINT "product_events_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
