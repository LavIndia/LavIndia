"use client";

import React, { useState, useEffect } from "react";
import { css } from "styled-system/css";

type PromoBanner = {
  id: string;
  type: string;
  title: string | null;
  message: string;
  bgColor: string | null;
  textColor: string | null;
  isActive: boolean;
  startDate: Date | null;
  endDate: Date | null;
  order: number;
};

const wrapStyle = css({
  position: "relative",
  width: "full",
  background: "bg.surface",
  borderBottom: "1px solid",
  borderColor: "border.subtle",
});
const trackStyle = css({ overflow: "hidden" });
const marqueeRowStyle = css({ display: "flex", alignItems: "center", paddingY: "4", willChange: "transform" });
const marqueeGroupStyle = css({ display: "flex", gap: "10", whiteSpace: "nowrap" });
const messageStyle = css({
  marginX: "10",
  fontWeight: "semibold",
  fontSize: "lg",
  md: { fontSize: "xl" },
});

export default function TopPromoBanner({
  banners: providedBanners,
  speed = 25,
}: {
  banners?: PromoBanner[];
  speed?: number;
}) {
  const [paused, setPaused] = useState(false);
  const [fetchedBanners, setFetchedBanners] = useState<PromoBanner[]>([]);

  // If no banners were provided by a server-rendering parent, fetch them
  // client-side as a fallback (keeps this component safe to drop into any
  // page, including client-component pages that can't fetch server-side).
  useEffect(() => {
    if (providedBanners !== undefined) return;

    let cancelled = false;
    fetch("/api/promo-banners?type=top_scroll")
      .then((res) => (res.ok ? res.json() : { banners: [] }))
      .then((data) => {
        if (!cancelled) setFetchedBanners(data.banners || []);
      })
      .catch(() => {
        if (!cancelled) setFetchedBanners([]);
      });
    return () => {
      cancelled = true;
    };
  }, [providedBanners]);

  const banners = providedBanners ?? fetchedBanners;

  if (banners.length === 0) {
    return null; // Hide banner if no messages
  }

  const marqueeStyle: React.CSSProperties = {
    animation: `lav-marquee ${speed}s linear infinite`,
    animationPlayState: paused ? "paused" : "running",
    willChange: "transform",
    WebkitTransform: "translate3d(0,0,0)",
  };

  const bgColor = banners[0]?.bgColor || undefined;

  return (
    <div
      className={wrapStyle}
      role="region"
      aria-label="Top promotional banner"
      style={{ background: bgColor }}
    >
      <div
        className={trackStyle}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
        tabIndex={0}
      >
        <div className={marqueeRowStyle} style={marqueeStyle}>
          <div className={marqueeGroupStyle}>
            {banners.map((banner) => (
              <span
                key={`a-${banner.id}`}
                className={messageStyle}
                style={{ color: banner.textColor || undefined }}
              >
                {banner.message}
              </span>
            ))}
          </div>

          <div className={marqueeGroupStyle} aria-hidden>
            {banners.map((banner) => (
              <span
                key={`b-${banner.id}`}
                className={messageStyle}
                style={{ color: banner.textColor || undefined }}
              >
                {banner.message}
              </span>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes lav-marquee {
          from { transform: translate3d(0, 0, 0); }
          to { transform: translate3d(-50%, 0, 0); }
        }

        @media (prefers-reduced-motion: reduce) {
          [aria-label="Top promotional banner"] > div > div { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
