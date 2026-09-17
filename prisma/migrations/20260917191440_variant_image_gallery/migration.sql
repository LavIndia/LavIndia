/*
  Warnings:

  - You are about to drop the column `imageUrl` on the `product_variants` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "product_images" ADD COLUMN     "variantId" TEXT;

-- AlterTable
ALTER TABLE "product_variants" DROP COLUMN "imageUrl";

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
