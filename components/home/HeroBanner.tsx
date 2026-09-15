"use client";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import Autoplay from "embla-carousel-autoplay";
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import colors from "@/styles/colors";
import { designSystem } from "@/styles/design-system";

type HeroBannerSlide = {
  id: string;
  title: string;
  subtitle: string | null;
  imagePath: string;
  linkUrl: string | null;
  order: number;
  active: boolean;
};

type HeroBannerProps = {
  banners: HeroBannerSlide[];
  intervalMs?: number;
  className?: string;
};

export function HeroBanner({
  banners,
  intervalMs = 5000,
  className,
}: HeroBannerProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!api) {
      return;
    }

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap() + 1);

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });
  }, [api]);

  const baseClassName = "relative w-full overflow-hidden bg-black";
  const heightClassName = "h-[400px] sm:h-[500px] lg:h-[600px]";
  const composedClassName = [baseClassName, heightClassName, className]
    .filter(Boolean)
    .join(" ");

  // Empty state
  if (banners.length === 0) {
    return (
      <section className={composedClassName}>
        <div className="w-full h-full flex items-center justify-center bg-gray-900">
          <p className="text-white text-lg">No banners available</p>
        </div>
      </section>
    );
  }

  return (
    <section className={composedClassName}>
      <Carousel
        setApi={setApi}
        plugins={[Autoplay({ delay: intervalMs })]}
        className="w-full h-full"
        opts={{
          align: "start",
          loop: true,
        }}
      >
        <CarouselContent className={`h-full ${heightClassName}`}>
          {banners.map((slide, index) => (
            <CarouselItem
              key={slide.id}
              className={`relative h-full ${heightClassName}`}
            >
              <Link
                href={slide.linkUrl || "#"}
                className={`block h-full w-full ${heightClassName}`}
              >
                <Image
                  src={slide.imagePath}
                  alt={slide.title}
                  fill
                  className="object-cover select-none"
                  draggable={false}
                  priority={index === 0}
                />
              </Link>
            </CarouselItem>
          ))}
        </CarouselContent>
        {count > 1 && (
          <>
            <button
              type="button"
              className={`absolute left-2 sm:left-4 top-1/2 z-10 -translate-y-1/2 ${designSystem.borderRadius.full} bg-[${colors.accentGold}] ${designSystem.padding.sm} sm:${designSystem.padding.md} text-black ${designSystem.shadow.lg} ${designSystem.transition.normal} hover:bg-[${colors.accentGoldHover}] hover:scale-105`}
              onClick={() => {
                api?.scrollPrev();
                api?.plugins().autoplay?.reset();
              }}
              aria-label="Previous slide"
            >
              <ChevronLeft className="h-4 w-4 sm:h-6 sm:w-6" />
            </button>
            <button
              type="button"
              className={`absolute right-2 sm:right-4 top-1/2 z-10 -translate-y-1/2 ${designSystem.borderRadius.full} bg-[${colors.accentGold}] ${designSystem.padding.sm} sm:${designSystem.padding.md} text-black ${designSystem.shadow.lg} ${designSystem.transition.normal} hover:bg-[${colors.accentGoldHover}] hover:scale-105`}
              onClick={() => {
                api?.scrollNext();
                api?.plugins().autoplay?.reset();
              }}
              aria-label="Next slide"
            >
              <ChevronRight className="h-4 w-4 sm:h-6 sm:w-6" />
            </button>
          </>
        )}
      </Carousel>
      {count > 1 && (
        <div className="absolute bottom-2 sm:bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-1 sm:gap-2">
          {Array.from({ length: count }, (_, index) => (
            <button
              key={index}
              type="button"
              className={`h-2 w-2 sm:h-3 sm:w-3 rounded-full transition ${
                index === current - 1
                  ? `bg-[${colors.accentGold}]`
                  : "bg-white/50 hover:bg-white/70"
              }`}
              onClick={() => {
                api?.scrollTo(index);
                api?.plugins().autoplay?.reset();
              }}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
