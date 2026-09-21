"use client";
import { HeroSlideImage } from "@/components/home/HeroSlideImage";
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
import { css, cx } from "styled-system/css";

type HeroBannerSlide = {
  id: string;
  title: string;
  subtitle: string | null;
  imagePath: string;
  /** Optional portrait artwork shown on phones; see HeroSlideImage. */
  mobileImagePath?: string | null;
  linkUrl: string | null;
  order: number;
  active: boolean;
};

type HeroBannerProps = {
  banners: HeroBannerSlide[];
  intervalMs?: number;
  className?: string;
};

// Literal pixel heights (not `height:"full"`) at every level from the frame
// down to CarouselItem: next/image's `fill` needs a concrete-height ancestor
// chain, and a percentage height only resolves against an ancestor that
// itself has a concrete height — the embla viewport div in CarouselContent
// has no explicit height, which breaks that chain if items only use `full`.
//
// The phone height is close to square, which is the shape the phone artwork
// is prepared in, so the card crops almost nothing.
const HERO_HEIGHT = { base: "360px", md: "560px", lg: "760px" };

// On a phone the hero is a card: inset from the page edges and rounded, the
// way a banner is presented in a modern storefront, rather than a strip
// bleeding into the header above it. From `md` it goes full-bleed again,
// which is where a wide banner belongs.
const sectionStyle = css({
  position: "relative",
  width: "full",
  background: "bg.canvas",
  paddingInline: { base: "4", md: "0" },
  paddingTop: { base: "3", md: "0" },
  paddingBottom: { base: "1", md: "0" },
});

// The frame is what actually clips, so the rounding and the shadow live here
// and the section is left free to hold the page margin around it.
const frameStyle = css({
  position: "relative",
  width: "full",
  overflow: "hidden",
  background: "onyx.900",
  borderRadius: "2xl",
  boxShadow: "card",
  height: HERO_HEIGHT.base,
  md: { height: HERO_HEIGHT.md, borderRadius: "0", boxShadow: "none" },
  lg: { height: HERO_HEIGHT.lg },
});

const itemHeightStyle = css({
  height: HERO_HEIGHT.base,
  md: { height: HERO_HEIGHT.md },
  lg: { height: HERO_HEIGHT.lg },
});

const slideLinkStyle = css({
  display: "block",
  height: "full",
  width: "full",
});

const navButtonStyle = css({
  position: "absolute",
  top: "50%",
  zIndex: "10",
  transform: "translateY(-50%)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "full",
  background: "bg.glassStrong",
  backdropBlur: "glass",
  border: "1px solid",
  borderColor: "border.glass",
  color: "fg.default",
  boxShadow: "glass",
  cursor: "pointer",
  width: "9",
  height: "9",
  md: { width: "11", height: "11" },
  transition: "transform 0.18s ease, background 0.18s ease",
  "&:hover": { background: "bg.glass", transform: "translateY(-50%) scale(1.06)" },
  "&:active": { transform: "translateY(-50%) scale(0.96)" },
});

const dotsWrapStyle = css({
  position: "absolute",
  bottom: "3",
  md: { bottom: "5" },
  left: "50%",
  zIndex: "10",
  transform: "translateX(-50%)",
  display: "flex",
  alignItems: "center",
  gap: "2",
  paddingX: "3",
  paddingY: "1.5",
  borderRadius: "full",
  background: "bg.glass",
  backdropBlur: "glassSm",
  border: "1px solid",
  borderColor: "border.glass",
});

const dotStyle = cx(
  css({
    borderRadius: "full",
    cursor: "pointer",
    transition: "all 0.25s ease",
    height: "2",
    width: "2",
    background: "rgba(255,255,255,0.5)",
    "&:hover": { background: "rgba(255,255,255,0.75)" },
  })
);

const dotActiveStyle = css({
  width: "6",
  background: "linear-gradient(135deg, {colors.gold.300}, {colors.gold.500})",
  boxShadow: "gold",
});

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

  const composedClassName = cx(sectionStyle, className);

  // Empty state
  if (banners.length === 0) {
    return (
      <section className={composedClassName}>
        <div
          className={cx(
            frameStyle,
            css({
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "onyx.800",
            }),
          )}
        >
          <p className={css({ color: "ivory.50", fontSize: "lg" })}>
            No banners available
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className={composedClassName}>
      <div className={frameStyle}>
        <Carousel
          setApi={setApi}
          plugins={[Autoplay({ delay: intervalMs })]}
          className={css({ width: "full", height: "full" })}
          opts={{
            align: "start",
            loop: true,
          }}
        >
          <CarouselContent className={cx(css({ height: "full" }), itemHeightStyle)}>
            {banners.map((slide, index) => (
              <CarouselItem
                key={slide.id}
                className={cx(css({ position: "relative" }), itemHeightStyle)}
              >
                <Link href={slide.linkUrl || "#"} className={slideLinkStyle}>
                  <HeroSlideImage
                    src={slide.imagePath}
                    mobileSrc={slide.mobileImagePath}
                    alt={slide.title}
                    priority={index === 0}
                  />
                </Link>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        {/* Arrows and dots sit on the frame rather than inside Carousel's own
            percentage-height wrapper — that extra layer of height:"full"
            resolution was what sent them to the bottom of the hero instead of
            leaving them vertically centred. Being on the frame also keeps
            them inside the rounded card on a phone. */}
        {count > 1 && (
          <>
            <button
              type="button"
              className={cx(navButtonStyle, css({ left: "2", md: { left: "4" } }))}
              onClick={() => {
                api?.scrollPrev();
                api?.plugins().autoplay?.reset();
              }}
              aria-label="Previous slide"
            >
              <ChevronLeft
                className={css({ height: "4", width: "4", md: { height: "5", width: "5" } })}
              />
            </button>
            <button
              type="button"
              className={cx(navButtonStyle, css({ right: "2", md: { right: "4" } }))}
              onClick={() => {
                api?.scrollNext();
                api?.plugins().autoplay?.reset();
              }}
              aria-label="Next slide"
            >
              <ChevronRight
                className={css({ height: "4", width: "4", md: { height: "5", width: "5" } })}
              />
            </button>
          </>
        )}

        {count > 1 && (
          <div className={dotsWrapStyle}>
            {Array.from({ length: count }, (_, index) => (
              <button
                key={index}
                type="button"
                className={cx(dotStyle, index === current - 1 && dotActiveStyle)}
                onClick={() => {
                  api?.scrollTo(index);
                  api?.plugins().autoplay?.reset();
                }}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
