import { prisma } from "@/lib/prisma";
import { HeroBannersTable } from "@/components/admin/hero-banners/HeroBannersTable";
import { HeroBannersHeader } from "@/components/admin/hero-banners/HeroBannersHeader";
import { syncHeroBannersFromStorage } from "@/lib/hero-banners";
import { css } from "styled-system/css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getHeroBanners() {
  await syncHeroBannersFromStorage();
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
