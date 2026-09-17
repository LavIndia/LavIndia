"use client";

import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { cx } from "styled-system/css";

interface ShareButtonProps {
  title: string;
  text: string;
  url: string;
  className: string;
  iconClassName?: string;
  "aria-label"?: string;
}

async function copyLink(url: string) {
  try {
    await navigator.clipboard.writeText(url);
    toast.success("Link copied");
  } catch {
    toast.error("Couldn't copy the link");
  }
}

// Native OS share sheet only — WhatsApp/Instagram/Messages/etc. are
// whatever the device already offers there. No custom share menu.
export function ShareButton({
  title,
  text,
  url,
  className,
  iconClassName,
  ...props
}: ShareButtonProps) {
  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const shareUrl = url.startsWith("http")
      ? url
      : `${window.location.origin}${url}`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text, url: shareUrl });
      } catch (error) {
        // AbortError just means the person closed the share sheet —
        // that's a normal cancel, not a failure worth falling back for.
        if (error instanceof Error && error.name === "AbortError") return;
        await copyLink(shareUrl);
      }
      return;
    }

    await copyLink(shareUrl);
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      className={cx(className)}
      aria-label={props["aria-label"] ?? `Share ${title}`}
    >
      <Share2 className={iconClassName} />
    </button>
  );
}
