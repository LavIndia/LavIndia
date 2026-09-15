import { prisma } from "@/lib/prisma";
import { HeroBannerForm } from "@/components/admin/hero-banners/HeroBannerForm";
import { notFound } from "next/navigation";

async function getHeroBanner(id: string) {
  const banner = await prisma.heroBanner.findUnique({
    where: { id },
  });
  return banner;
}

export default async function EditHeroBannerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const banner = await getHeroBanner(id);

  if (!banner) {
    notFound();
  }

  return <HeroBannerForm banner={banner} />;
}
