import { prisma } from "@/lib/prisma";
import { HomePageLayoutTable } from "@/components/admin/homepage-layout/HomePageLayoutTable";
import { HomePageLayoutHeader } from "@/components/admin/homepage-layout/HomePageLayoutHeader";
import { css } from "styled-system/css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getHomePageSections() {
  const sections = await prisma.homePageSection.findMany({
    orderBy: { order: "asc" },
  });
  return sections;
}

export default async function HomePageLayoutPage() {
  const sections = await getHomePageSections();

  return (
    <div className={css({ display: "flex", flexDirection: "column", gap: "6" })}>
      <HomePageLayoutHeader />
      <HomePageLayoutTable sections={sections} />
    </div>
  );
}
