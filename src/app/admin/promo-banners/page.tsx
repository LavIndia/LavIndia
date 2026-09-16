import { prisma } from "@/lib/prisma";
import { PromoBannersTable } from "@/components/admin/promo-banners/PromoBannersTable";
import { PromoBannersHeader } from "@/components/admin/promo-banners/PromoBannersHeader";
import { css } from "styled-system/css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getPromoBanners() {
  const banners = await prisma.promoBanner.findMany({
    orderBy: { order: "asc" },
  });
  return banners;
}

export default async function PromoBannersPage() {
  const banners = await getPromoBanners();

  return (
    <div className={css({ display: "flex", flexDirection: "column", gap: "6" })}>
      <PromoBannersHeader />
      <PromoBannersTable banners={banners} />
    </div>
  );
}
