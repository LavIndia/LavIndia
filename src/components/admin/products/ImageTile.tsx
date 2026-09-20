"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { GripVertical, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { css, cx } from "styled-system/css";

/**
 * One image in a gallery editor: the picture, its drag handle, the primary
 * badge, the hover actions and its alt text. The gallery owns ordering and
 * primary-ness; this only renders one tile and reports what was pressed.
 */

const cardStyle = css({
  position: "relative",
  cursor: "grab",
  "&:hover .image-actions": { opacity: 1 },
});
const frameStyle = css({ aspectRatio: "1 / 1", position: "relative" });
const pictureStyle = css({ objectFit: "cover", borderRadius: "md" });
const handleStyle = css({
  position: "absolute",
  top: "2",
  left: "2",
  background: "rgba(255,255,255,0.85)",
  borderRadius: "md",
  padding: "1",
});
const primaryBadgeStyle = css({
  position: "absolute",
  top: "2",
  right: "2",
  background: "linear-gradient(135deg, {colors.gold.300}, {colors.gold.500})",
  color: "fg.onGold",
  fontSize: "xs",
  paddingInline: "2",
  paddingBlock: "1",
  borderRadius: "full",
});
const actionsStyle = css({
  position: "absolute",
  inset: 0,
  background: "rgba(18, 17, 16, 0.5)",
  opacity: 0,
  transition: "opacity 0.15s ease",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "2",
  borderRadius: "md",
});
const footerStyle = css({ padding: "2", display: "flex", flexDirection: "column", gap: "2" });

export interface ImageTileProps {
  url: string;
  alt: string | null;
  isPrimary: boolean;
  sizes?: string;
  onSetPrimary: () => void;
  onRemove: () => void;
  onAltChange: (alt: string) => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  /** Extra controls beneath the alt text, e.g. moving the image elsewhere. */
  footer?: ReactNode;
}

export function ImageTile({
  url,
  alt,
  isPrimary,
  sizes = "(min-width: 768px) 25vw, 50vw",
  onSetPrimary,
  onRemove,
  onAltChange,
  onDragStart,
  onDragOver,
  onDragEnd,
  footer,
}: ImageTileProps) {
  return (
    <Card
      className={cardStyle}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
      <div className={frameStyle}>
        <Image src={url} alt={alt || "Product image"} fill sizes={sizes} className={pictureStyle} />

        <div className={handleStyle}>
          <GripVertical className={css({ height: "4", width: "4" })} />
        </div>

        {isPrimary && <div className={primaryBadgeStyle}>Primary</div>}

        <div className={cx("image-actions", actionsStyle)}>
          <Button type="button" size="icon" variant="secondary" onClick={onSetPrimary} title="Set as primary">
            <Star
              className={css({
                height: "4",
                width: "4",
                color: isPrimary ? "gold.500" : "currentColor",
                fill: isPrimary ? "token(colors.gold.500)" : "none",
              })}
            />
          </Button>
          <Button type="button" size="icon" variant="destructive" onClick={onRemove} title="Remove">
            <X className={css({ height: "4", width: "4" })} />
          </Button>
        </div>
      </div>

      <div className={footerStyle}>
        <Input
          placeholder="Alt text"
          value={alt || ""}
          onChange={(e) => onAltChange(e.target.value)}
          className={css({ fontSize: "xs" })}
        />
        {footer}
      </div>
    </Card>
  );
}
