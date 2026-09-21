"use client";

import { useId, useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Check, ImageIcon, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { css, cx } from "styled-system/css";

/**
 * One piece of hero artwork: choose it, see it, replace it, remove it.
 *
 * Written once and used twice — for the landscape image every banner needs
 * and for the optional portrait image phones get — because the two differ
 * only in their frame, their guidance and whether they are required. Before
 * this existed the upload block was inlined in the form, so a second slot
 * would have meant a second copy of it.
 */

const columnStyle = css({ display: "flex", flexDirection: "column", gap: "3" });
const headRowStyle = css({ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "2" });
const statusStyle = css({ display: "flex", alignItems: "center", gap: "1", fontSize: "xs", color: "success" });
const uploadingStyle = css({ display: "flex", alignItems: "center", gap: "1", fontSize: "xs", color: "accent.pressed" });
const iconSmStyle = css({ width: "3.5", height: "3.5" });
const hintStyle = css({ fontSize: "xs", color: "fg.muted" });
const requiredMark = css({ color: "danger" });

const overlayBarStyle = css({
  position: "absolute",
  insetX: "0",
  bottom: "0",
  display: "flex",
  transform: "translateY(100%)",
  alignItems: "center",
  justifyContent: "space-between",
  background: "rgba(18,17,16,0.65)",
  paddingInline: "3",
  paddingBlock: "2",
  color: "white",
  transition: "transform 0.18s ease",
  ".group:hover &": { transform: "translateY(0)" },
});
const removeButtonStyle = css({
  position: "absolute",
  right: "3",
  top: "3",
  opacity: 0,
  transition: "opacity 0.18s ease",
  ".group:hover &": { opacity: 1 },
});
const busyOverlayStyle = css({
  position: "absolute",
  inset: "0",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(18,17,16,0.45)",
  color: "white",
  fontSize: "sm",
  fontWeight: "medium",
});

export interface HeroBannerArtworkFieldProps {
  label: string;
  /** The stored path, or "" when nothing has been chosen. */
  value: string;
  onChange: (url: string) => void;
  /** The shape the preview and the empty state are drawn in, e.g. "16 / 7". */
  aspectRatio: string;
  /** What this slot is for and what size it wants, in the admin's words. */
  hint: string;
  required?: boolean;
  /** Sent along with the upload so the stored file has a meaningful name. */
  title: string;
  /** Widest the preview is drawn, so it does not dominate the form. */
  maxWidth?: string;
  /** Which slot this fills; phone artwork is stored apart from desktop. */
  variant?: "desktop" | "mobile";
}

export function HeroBannerArtworkField({
  label,
  value,
  onChange,
  aspectRatio,
  hint,
  required = false,
  title,
  maxWidth,
  variant = "desktop",
}: HeroBannerArtworkFieldProps) {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const uploadData = new FormData();
      uploadData.append("file", file);
      uploadData.append("title", title);
      uploadData.append("variant", variant);
      const response = await fetch("/api/admin/hero-banners/upload", {
        method: "POST",
        body: uploadData,
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to upload image");

      onChange(result.url);
      toast.success("Image uploaded");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to upload image");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const frameStyle = css({
    position: "relative",
    overflow: "hidden",
    borderRadius: "xl",
    border: "1px solid",
    borderColor: "border.subtle",
    background: "bg.surface",
    width: "full",
  });

  return (
    <div className={columnStyle}>
      <div className={headRowStyle}>
        <Label htmlFor={inputId}>
          {label} {required && <span className={requiredMark}>*</span>}
        </Label>
        {value && !isUploading && (
          <span className={statusStyle}>
            <Check className={iconSmStyle} /> Stored image
          </span>
        )}
        {isUploading && (
          <span className={uploadingStyle}>
            <Upload className={iconSmStyle} /> Uploading&hellip;
          </span>
        )}
      </div>

      <input
        ref={fileInputRef}
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleUpload}
        className={css({ display: "none" })}
      />

      {value ? (
        <div className={cx("group", frameStyle)} style={{ aspectRatio, maxWidth }}>
          <Image src={value} alt={label} fill className={css({ objectFit: "cover" })} sizes="(max-width: 1024px) 100vw, 640px" />
          {isUploading && <div className={busyOverlayStyle}>Uploading new image&hellip;</div>}
          <div className={overlayBarStyle}>
            <span className={css({ truncate: true, fontSize: "xs" })}>Ready to publish</span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Upload className={css({ marginRight: "2", width: "3.5", height: "3.5" })} /> Replace
            </Button>
          </div>
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className={removeButtonStyle}
            onClick={() => onChange("")}
            aria-label={`Remove ${label.toLowerCase()}`}
          >
            <X className={css({ width: "4", height: "4" })} />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          className={css({
            display: "flex",
            width: "full",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "2",
            borderRadius: "md",
            border: "1px dashed",
            borderColor: "border.subtle",
            color: "fg.muted",
            cursor: "pointer",
            transition: "border-color 0.15s ease, color 0.15s ease",
            "&:hover": { borderColor: "accent.default", color: "accent.pressed" },
            "&:disabled": { cursor: "not-allowed", opacity: 0.6 },
          })}
          style={{ aspectRatio, maxWidth }}
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          <div className={css({ borderRadius: "full", background: "gold.100", padding: "3", color: "accent.pressed" })}>
            <ImageIcon className={css({ width: "7", height: "7" })} />
          </div>
          <span className={css({ fontWeight: "medium", color: "fg.default" })}>
            {isUploading ? "Uploading..." : `Choose ${label.toLowerCase()}`}
          </span>
          <span className={css({ fontSize: "xs" })}>PNG, JPG or WebP · up to 10MB</span>
        </button>
      )}

      <p className={hintStyle}>{hint}</p>
    </div>
  );
}
