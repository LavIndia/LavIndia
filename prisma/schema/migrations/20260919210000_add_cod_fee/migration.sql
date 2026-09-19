-- Cash-on-delivery fee, in paise. Defaults to zero so existing installations
-- keep offering COD free until the owner sets a charge.
ALTER TABLE "site_settings" ADD COLUMN "codFeeCents" INTEGER NOT NULL DEFAULT 0;
