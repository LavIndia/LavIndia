-- The login/signup screen images are managed via the existing ImageKit folder
-- listing (/assets/pictures/loginCoursels), same pattern as hero banners, so
-- this single-image column added in the previous migration is unused.
ALTER TABLE "site_settings" DROP COLUMN "authImagePath";
