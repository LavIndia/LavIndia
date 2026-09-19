"use client";

import { useState } from "react";
import Image from "next/image";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { css, cx } from "styled-system/css";

const triggerStyle = css({
  display: "inline-block",
  lineHeight: 0,
  padding: 0,
  border: "none",
  background: "none",
  cursor: "zoom-in",
  borderRadius: "md",
  outline: "none",
  transition: "opacity 0.15s ease",
  "&:hover": { opacity: 0.85 },
  "&:focus-visible": { boxShadow: "0 0 0 3px token(colors.gold.200)" },
});

const lightboxModalStyle = css({
  width: "auto",
  maxWidth: { base: "[92vw]", md: "[70vw]" },
  background: "bg.surface",
});

const imageWrapStyle = css({
  position: "relative",
  width: "[80vw]",
  maxWidth: "[720px]",
  height: "[70vh]",
  maxHeight: "[70vh]",
});

interface ImageLightboxProps {
  src: string;
  alt: string;
  children: React.ReactNode;
  className?: string;
}

/** Wraps a thumbnail so clicking it opens a larger preview of the same image in a dialog. */
export function ImageLightbox({ src, alt, children, className }: ImageLightboxProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className={cx(triggerStyle, className)}
        aria-label={`View larger image${alt ? `: ${alt}` : ""}`}
      >
        {children}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className={lightboxModalStyle} aria-label={alt || "Image preview"}>
          <div className={imageWrapStyle}>
            <Image src={src} alt={alt} fill sizes="80vw" className={css({ objectFit: "contain" })} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
