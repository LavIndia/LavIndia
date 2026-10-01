import { prisma } from "@/lib/prisma";
import { HeroBannersTable } from "@/components/admin/hero-banners/HeroBannersTable";
import { HeroBannersHeader } from "@/components/admin/hero-banners/HeroBannersHeader";
import { css } from "styled-system/css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Banners are exactly the rows an admin saved. This list used to be
// "synced" from the image folder on every visit, which turned any stray
// upload (an image picked and then abandoned) into a live banner with its
// filename for a headline, and deleted rows whose file it could not see.
async function getHeroBanners() {
  const banners = await prisma.heroBanner.findMany({
    orderBy: { order: "asc" },
  });
  return banners;
}

export default async function HeroBannersPage() {
  const banners = await getHeroBanners();

  return (
    <div className={css({ display: "flex", flexDirection: "column", gap: "6" })}>
      <HeroBannersHeader />
      <HeroBannersTable banners={banners} />
    </div>
  );
}
