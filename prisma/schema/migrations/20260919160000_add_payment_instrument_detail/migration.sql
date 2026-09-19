-- Which instrument a gateway payment actually used, in the customer's words.
-- Additive and nullable: existing payments keep NULL and simply fall back to
-- the generic method label until a newer payment records the detail.
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "instrumentDetail" TEXT;
