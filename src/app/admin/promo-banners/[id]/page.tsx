import { prisma } from "@/lib/prisma";
import { PromoBannerForm } from "@/components/admin/promo-banners/PromoBannerForm";
import { notFound } from "next/navigation";

async function getPromoBanner(id: string) {
  const banner = await prisma.promoBanner.findUnique({
    where: { id },
  });
  return banner;
}

export default async function EditPromoBannerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const banner = await getPromoBanner(id);

  if (!banner) {
    notFound();
  }

  return <PromoBannerForm banner={banner} />;
}
