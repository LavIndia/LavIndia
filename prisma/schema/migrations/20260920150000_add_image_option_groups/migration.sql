-- Images are filed under an option value (e.g. Colour: Gold) rather than
-- under one variant, so the Gold photographs serve every Gold variant.
ALTER TABLE "product_images" ADD COLUMN "optionDimension" TEXT;
ALTER TABLE "product_images" ADD COLUMN "optionValue" TEXT;

-- Backfill: an image that belonged to a variant now belongs to that
-- variant's most distinguishing option value. Colour first, because that is
-- what a photograph shows; then material; then size. A variant with no
-- option values (the implicit Default) had only general images.
UPDATE "product_images" AS img
SET "optionDimension" = CASE
      WHEN v."color"    IS NOT NULL AND v."color"    <> '' THEN 'color'
      WHEN v."material" IS NOT NULL AND v."material" <> '' THEN 'material'
      WHEN v."size"     IS NOT NULL AND v."size"     <> '' THEN 'size'
    END,
    "optionValue" = CASE
      WHEN v."color"    IS NOT NULL AND v."color"    <> '' THEN v."color"
      WHEN v."material" IS NOT NULL AND v."material" <> '' THEN v."material"
      WHEN v."size"     IS NOT NULL AND v."size"     <> '' THEN v."size"
    END
FROM "product_variants" AS v
WHERE img."variantId" = v."id";

CREATE INDEX "product_images_productId_optionDimension_optionValue_idx"
  ON "product_images"("productId", "optionDimension", "optionValue");
