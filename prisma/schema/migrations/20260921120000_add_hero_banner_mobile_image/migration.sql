-- Optional portrait artwork for hero banners on phones.
--
-- Purely additive and nullable: every existing banner keeps working
-- unchanged, and falls back to its landscape image until an admin uploads a
-- mobile crop.
ALTER TABLE "hero_banners" ADD COLUMN "mobileImagePath" TEXT;
