import TopPromoBanner from "@/components/home/TopPromoBanner";
import { getPromoBanners } from "@/lib/homepage-data";

export async function TopPromoBannerServer({ speed }: { speed?: number }) {
  const banners = await getPromoBanners("top_scroll");
  return <TopPromoBanner banners={banners} speed={speed} />;
}
