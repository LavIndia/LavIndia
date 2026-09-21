"use client";

import { css } from "styled-system/css";

/**
 * The artwork of one hero slide, with art direction between phone and
 * desktop.
 *
 * Deliberately a plain `<picture>` rather than next/image. next/image can
 * resize one picture for different screens, but it cannot show a *different*
 * picture on a phone, and that is exactly what is needed here: a 16:9 banner
 * cover-cropped into a phone's near-square hero frame keeps barely half its
 * width, which on a composed banner removes the wordmark and the call to
 * action. `<picture>` lets the browser pick the right artwork before it
 * downloads anything, so the phone never pays for the desktop file.
 *
 * With no mobile artwork the markup collapses to a single source and the
 * behaviour is exactly what it was: the landscape image, cover-cropped,
 * anchored to the top where banner titles sit.
 */

const imageStyle = css({
  position: "absolute",
  inset: "0",
  width: "full",
  height: "full",
  objectFit: "cover",
  objectPosition: "top",
  userSelect: "none",
});

/** The width at which the desktop artwork takes over. Matches Panda's `md`. */
const DESKTOP_FROM = "(min-width: 768px)";

export interface HeroSlideImageProps {
  src: string;
  /** Portrait artwork for phones; the desktop image is used without it. */
  mobileSrc?: string | null;
  alt: string;
  /** True for the first slide, which is the page's largest paint. */
  priority?: boolean;
}

export function HeroSlideImage({ src, mobileSrc, alt, priority = false }: HeroSlideImageProps) {
  return (
    <picture>
      {mobileSrc && <source media={DESKTOP_FROM} srcSet={src} />}
      <img
        src={mobileSrc || src}
        alt={alt}
        className={imageStyle}
        draggable={false}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding={priority ? "sync" : "async"}
      />
    </picture>
  );
}
