"use client";

import React, { useState, useEffect } from "react";
import colors from "../../styles/colors";

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
    animation: `marquee ${speed}s linear infinite`,
    animationPlayState: paused ? "paused" : "running",
    willChange: "transform",
    WebkitTransform: "translate3d(0,0,0)",
  };

  const bgColor = banners[0]?.bgColor || colors.background;

  return (
    <div
      className="relative w-full"
      role="region"
      aria-label="Top promotional banner"
      style={{
        background: bgColor,
        borderBottom: `1px solid ${colors.border}`,
      }}
    >
      <div
        className="overflow-hidden"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
        tabIndex={0}
      >
        <div className="marquee py-4" style={marqueeStyle}>
          <div className="marquee-group">
            {banners.map((banner) => (
              <span
                key={`a-${banner.id}`}
                className="mx-10 font-semibold text-xl md:text-2xl"
                style={{
                  color: banner.textColor || colors.primaryText,
                }}
              >
                {banner.message}
              </span>
            ))}
          </div>

          <div className="marquee-group" aria-hidden>
            {banners.map((banner) => (
              <span
                key={`b-${banner.id}`}
                className="mx-10 font-semibold text-xl md:text-2xl"
                style={{
                  color: banner.textColor || colors.primaryText,
                }}
              >
                {banner.message}
              </span>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .marquee { display: flex; align-items: center; }
  .marquee-group { display: flex; gap: 2.5rem; white-space: nowrap; }

        @keyframes marquee {
          from { transform: translate3d(0, 0, 0); }
          to { transform: translate3d(-50%, 0, 0); }
        }

        .marquee { will-change: transform; }

        @media (prefers-reduced-motion: reduce) {
          .marquee { animation: none !important; }
        }

        @supports (transform: translate3d(0,0,0)) {
          .marquee { transform: translate3d(0,0,0); }
        }
      `}</style>
    </div>
  );
}
