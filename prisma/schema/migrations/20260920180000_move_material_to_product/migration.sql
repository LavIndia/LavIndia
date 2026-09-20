-- Material becomes a product-level fact rather than a variant option.
--
-- Material moves the price, and a listing card shows one price per product,
-- so the same design in two materials is two products. Colour and size stay
-- as the variant options a shopper chooses on a single page.
ALTER TABLE "products" ADD COLUMN "material" TEXT;

-- Lift any material a product's variants already agreed on. No variant in
-- this catalogue carries one, so this is a no-op here, but it keeps the
-- migration correct for any environment that does.
UPDATE "products" AS p
SET "material" = sub."material"
FROM (
  SELECT v."productId", MIN(v."material") AS "material"
  FROM "product_variants" v
  WHERE v."material" IS NOT NULL AND v."material" <> ''
  GROUP BY v."productId"
  HAVING COUNT(DISTINCT v."material") = 1
) AS sub
WHERE p."id" = sub."productId";

UPDATE "product_variants" SET "material" = NULL WHERE "material" IS NOT NULL;
