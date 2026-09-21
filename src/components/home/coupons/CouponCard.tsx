"use client";

import { Check, Copy } from "lucide-react";
import { css, cx } from "styled-system/css";

/**
 * One offer, shaped like a ticket.
 *
 * The whole card copies the code. The previous card asked for the code to be
 * read out of a labelled box and then a separate button to be pressed, which
 * is three elements and two rows for one action; here the card is the
 * button, and the icon only reports what happened.
 *
 * The stub carries the saving because that is the thing worth reading from
 * across a page, and it lets the body hold the words at a normal weight
 * instead of competing with a badge.
 */

const cardStyle = css({
  display: "flex",
  alignItems: "stretch",
  width: "full",
  textAlign: "left",
  borderRadius: "xl",
  overflow: "hidden",
  background: "bg.surface",
  border: "1px solid",
  borderColor: "gold.200",
  boxShadow: "card",
  cursor: "pointer",
  transition: "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
  "&:hover": { transform: "translateY(-2px)", boxShadow: "glass", borderColor: "gold.400" },
  "&:focus-visible": { outline: "2px solid", outlineColor: "accent.default", outlineOffset: "2px" },
});

/** The saving, on a gold stub down the left edge. */
const stubStyle = css({
  display: "flex",
  flexShrink: 0,
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "0.5",
  width: "5.5rem",
  sm: { width: "6.5rem" },
  paddingInline: "2",
  paddingBlock: "4",
  background: "linear-gradient(135deg, {colors.gold.300}, {colors.gold.500})",
  color: "fg.onGold",
  textAlign: "center",
});
const stubValueStyle = css({
  fontFamily: "display",
  fontSize: "xl",
  sm: { fontSize: "2xl" },
  fontWeight: "bold",
  lineHeight: "none",
  whiteSpace: "nowrap",
});
const stubLabelStyle = css({
  fontSize: "2xs",
  fontWeight: "semibold",
  letterSpacing: "widest",
  textTransform: "uppercase",
  opacity: 0.85,
});

/** The perforation. A dashed rule reads as a ticket without any cut-outs. */
const perforationStyle = css({
  width: "0",
  borderLeft: "1px dashed",
  borderColor: "gold.200",
  flexShrink: 0,
});

const bodyStyle = css({
  display: "flex",
  flex: "1",
  minWidth: 0,
  alignItems: "center",
  gap: "3",
  paddingInline: "4",
  paddingBlock: "3.5",
});
const textColStyle = css({ display: "flex", flexDirection: "column", gap: "0.5", minWidth: 0, flex: "1" });
const titleStyle = css({ fontWeight: "semibold", fontSize: "sm", color: "fg.default", lineClamp: "1" });
const descriptionStyle = css({ fontSize: "xs", color: "fg.muted", lineClamp: "1" });
const codeRowStyle = css({ display: "flex", alignItems: "center", gap: "2", marginTop: "1" });
const codeStyle = css({
  fontFamily: "mono",
  fontWeight: "bold",
  fontSize: "sm",
  letterSpacing: "wide",
  color: "fg.default",
});
const copyHintStyle = css({ fontSize: "2xs", color: "fg.subtle" });
const metaStyle = css({ fontSize: "2xs", color: "fg.subtle", marginTop: "1" });
const iconWrapStyle = css({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  width: "9",
  height: "9",
  borderRadius: "full",
  background: "gold.50",
  color: "accent.pressed",
  transition: "background 0.2s ease, color 0.2s ease",
});
const iconCopiedStyle = css({ background: "success", color: "white" });
const iconStyle = css({ width: "4", height: "4" });

export interface CouponCardProps {
  title: string;
  description: string | null;
  code: string;
  /** The saving, already formatted — "20%" or "₹500". */
  saving: string;
  /** Qualifiers and expiry, already worded; empty when there are none. */
  meta: string | null;
  copied: boolean;
  onCopy: () => void;
}

export function CouponCard({
  title,
  description,
  code,
  saving,
  meta,
  copied,
  onCopy,
}: CouponCardProps) {
  return (
    <button
      type="button"
      className={cardStyle}
      onClick={onCopy}
      aria-label={`Copy coupon code ${code}`}
    >
      <span className={stubStyle}>
        <span className={stubValueStyle}>{saving}</span>
        <span className={stubLabelStyle}>Off</span>
      </span>
      <span className={perforationStyle} />

      <span className={bodyStyle}>
        <span className={textColStyle}>
          <span className={titleStyle}>{title}</span>
          {/* Each line is dropped rather than shown empty. */}
          {description && <span className={descriptionStyle}>{description}</span>}
          <span className={codeRowStyle}>
            <span className={codeStyle}>{code}</span>
            <span className={copyHintStyle}>{copied ? "Copied" : "Tap to copy"}</span>
          </span>
          {meta && <span className={metaStyle}>{meta}</span>}
        </span>

        <span className={cx(iconWrapStyle, copied && iconCopiedStyle)} aria-hidden="true">
          {copied ? <Check className={iconStyle} /> : <Copy className={iconStyle} />}
        </span>
      </span>
    </button>
  );
}
