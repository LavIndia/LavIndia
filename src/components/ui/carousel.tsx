"use client";

import * as React from "react";
import useEmblaCarousel, {
  type UseEmblaCarouselType,
} from "embla-carousel-react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { css, cx } from "styled-system/css";

import { Button } from "@/components/ui/button";

type ButtonProps = React.ComponentProps<typeof Button>;

// Embla carousel engine is kept as-is; only presentation (container/controls)
// is restyled with Panda. Carousel motion/scroll physics stay with embla —
// Motion isn't needed on top of it (golden rule 5: no redundant animation).

type CarouselApi = UseEmblaCarouselType[1]
type UseCarouselParameters = Parameters<typeof useEmblaCarousel>
type CarouselOptions = UseCarouselParameters[0]
type CarouselPlugin = UseCarouselParameters[1]

type CarouselProps = {
  opts?: CarouselOptions
  plugins?: CarouselPlugin
  orientation?: "horizontal" | "vertical"
  setApi?: (api: CarouselApi) => void
}

type CarouselContextProps = {
  carouselRef: ReturnType<typeof useEmblaCarousel>[0]
  api: ReturnType<typeof useEmblaCarousel>[1]
  scrollPrev: () => void
  scrollNext: () => void
  canScrollPrev: boolean
  canScrollNext: boolean
} & CarouselProps

const CarouselContext = React.createContext<CarouselContextProps | null>(null)

function useCarousel() {
  const context = React.useContext(CarouselContext)

  if (!context) {
    throw new Error("useCarousel must be used within a <Carousel />")
  }

  return context
}

function Carousel({
  orientation = "horizontal",
  opts,
  setApi,
  plugins,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & CarouselProps) {
  const [carouselRef, api] = useEmblaCarousel(
    {
      ...opts,
      axis: orientation === "horizontal" ? "x" : "y",
    },
    plugins
  )
  const [canScrollPrev, setCanScrollPrev] = React.useState(false)
  const [canScrollNext, setCanScrollNext] = React.useState(false)

  const onSelect = React.useCallback((api: CarouselApi) => {
    if (!api) return
    setCanScrollPrev(api.canScrollPrev())
    setCanScrollNext(api.canScrollNext())
  }, [])

  const scrollPrev = React.useCallback(() => {
    api?.scrollPrev()
  }, [api])

  const scrollNext = React.useCallback(() => {
    api?.scrollNext()
  }, [api])

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault()
        scrollPrev()
      } else if (event.key === "ArrowRight") {
        event.preventDefault()
        scrollNext()
      }
    },
    [scrollPrev, scrollNext]
  )

  React.useEffect(() => {
    if (!api || !setApi) return
    setApi(api)
  }, [api, setApi])

  React.useEffect(() => {
    if (!api) return
    onSelect(api)
    api.on("reInit", onSelect)
    api.on("select", onSelect)

    return () => {
      api?.off("select", onSelect)
    }
  }, [api, onSelect])

  return (
    <CarouselContext.Provider
      value={{
        carouselRef,
        api: api,
        opts,
        orientation:
          orientation || (opts?.axis === "y" ? "vertical" : "horizontal"),
        scrollPrev,
        scrollNext,
        canScrollPrev,
        canScrollNext,
      }}
    >
      <div
        onKeyDownCapture={handleKeyDown}
        className={cx(css({ position: "relative" }), className)}
        role="region"
        aria-roledescription="carousel"
        data-slot="carousel"
        {...props}
      >
        {children}
      </div>
    </CarouselContext.Provider>
  )
}

function CarouselContent({ className, ...props }: React.ComponentProps<"div">) {
  const { carouselRef, orientation } = useCarousel()

  return (
    // `height: "full"` here so a consumer that sizes the Carousel root with
    // `height: "full"` (percentage) can flow that height all the way down
    // to CarouselItem — without it, this embla viewport div collapses to
    // its auto/content height (0, since its own children are percentage
    // sized too), breaking `next/image`'s `fill` on any percentage-sized
    // slide. See HeroBanner.tsx, which historically routed around this by
    // using literal pixel heights at every level instead.
    <div ref={carouselRef} className={css({ overflow: "hidden", height: "full" })} data-slot="carousel-content">
      <div
        className={cx(
          css({ display: "flex" }),
          orientation === "horizontal"
            ? css({ marginLeft: "-4" })
            : css({ marginTop: "-4", flexDirection: "column" }),
          className
        )}
        {...props}
      />
    </div>
  )
}

function CarouselItem({ className, ...props }: React.ComponentProps<"div">) {
  const { orientation } = useCarousel()

  return (
    <div
      role="group"
      aria-roledescription="slide"
      data-slot="carousel-item"
      className={cx(
        css({ minWidth: "0", flexShrink: "0", flexGrow: "0", flexBasis: "full" }),
        orientation === "horizontal" ? css({ paddingLeft: "4" }) : css({ paddingTop: "4" }),
        className
      )}
      {...props}
    />
  )
}

const carouselControlStyle = css({
  position: "absolute",
  borderRadius: "full",
  width: "8",
  height: "8",
});

const carouselControlPosition = {
  prev: {
    horizontal: css({ top: "50%", left: "-12", transform: "translateY(-50%)" }),
    vertical: css({ top: "-12", left: "50%", transform: "translateX(-50%) rotate(90deg)" }),
  },
  next: {
    horizontal: css({ top: "50%", right: "-12", transform: "translateY(-50%)" }),
    vertical: css({ bottom: "-12", left: "50%", transform: "translateX(-50%) rotate(90deg)" }),
  },
};

function CarouselPrevious({
  className,
  variant = "outline",
  size = "icon",
  disabled,
  ...props
}: ButtonProps) {
  const { orientation, scrollPrev, canScrollPrev } = useCarousel()

  return (
    <Button
      data-slot="carousel-previous"
      variant={variant}
      size={size}
      className={cx(carouselControlStyle, carouselControlPosition.prev[orientation ?? "horizontal"], className)}
      disabled={disabled ?? !canScrollPrev}
      onPress={scrollPrev}
      {...props}
    >
      <ArrowLeft />
      <span className={css({ srOnly: true })}>Previous slide</span>
    </Button>
  )
}

function CarouselNext({
  className,
  variant = "outline",
  size = "icon",
  disabled,
  ...props
}: ButtonProps) {
  const { orientation, scrollNext, canScrollNext } = useCarousel()

  return (
    <Button
      data-slot="carousel-next"
      variant={variant}
      size={size}
      className={cx(carouselControlStyle, carouselControlPosition.next[orientation ?? "horizontal"], className)}
      disabled={disabled ?? !canScrollNext}
      onPress={scrollNext}
      {...props}
    >
      <ArrowRight />
      <span className={css({ srOnly: true })}>Next slide</span>
    </Button>
  )
}

export {
  type CarouselApi,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
}
