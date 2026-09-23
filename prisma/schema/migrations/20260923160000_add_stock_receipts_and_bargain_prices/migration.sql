-- AlterTable
ALTER TABLE "inventory_movements" ADD COLUMN     "agreedUnitCostCents" INTEGER,
ADD COLUMN     "listUnitCostCents" INTEGER,
ADD COLUMN     "receiptId" TEXT;

-- AlterTable
ALTER TABLE "suppliers" ADD COLUMN     "city" TEXT,
ADD COLUMN     "pincode" TEXT,
ADD COLUMN     "state" TEXT;

-- CreateTable
CREATE TABLE "stock_receipts" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT,
    "invoiceNumber" TEXT,
    "invoiceDate" TIMESTAMP(3),
    "notes" TEXT,
    "receivedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stock_receipts_supplierId_createdAt_idx" ON "stock_receipts"("supplierId", "createdAt");

-- CreateIndex
CREATE INDEX "stock_receipts_createdAt_idx" ON "stock_receipts"("createdAt");

-- CreateIndex
CREATE INDEX "inventory_movements_receiptId_idx" ON "inventory_movements"("receiptId");

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "stock_receipts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_receipts" ADD CONSTRAINT "stock_receipts_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

