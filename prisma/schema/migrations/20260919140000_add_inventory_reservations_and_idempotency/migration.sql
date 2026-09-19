-- ---------------------------------------------------------------------------
-- Named, expiring stock reservations + movement idempotency.
--
-- Additive only. `InventoryLevel.reservedQuantity` stays the fast aggregate
-- the sell path reads; these rows are the detail behind it, written in the
-- same transaction. Existing levels and ledger entries are untouched.
-- ---------------------------------------------------------------------------

-- CreateEnum
CREATE TYPE "InventoryReservationStatus" AS ENUM ('HELD', 'RELEASED', 'CONSUMED');

-- AlterTable
ALTER TABLE "inventory_movements" ADD COLUMN     "idempotencyKey" TEXT;

-- CreateTable
CREATE TABLE "inventory_reservations" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" "InventoryReservationStatus" NOT NULL DEFAULT 'HELD',
    "referenceType" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "releasedAt" TIMESTAMP(3),
    "consumedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inventory_reservations_status_expiresAt_idx" ON "inventory_reservations"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "inventory_reservations_variantId_status_idx" ON "inventory_reservations"("variantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_reservations_referenceType_referenceId_variantId_key" ON "inventory_reservations"("referenceType", "referenceId", "variantId");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_movements_idempotencyKey_key" ON "inventory_movements"("idempotencyKey");

-- AddForeignKey
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "inventory_locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

