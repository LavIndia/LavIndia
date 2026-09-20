import { css, cva } from "styled-system/css";

/** Styling shared by the account screens. */

export const statusToneStyle = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: "full",
    border: "1px solid",
    paddingInline: "3",
    paddingBlock: "1",
    fontSize: "xs",
    fontWeight: "medium",
    fontFamily: "body",
  },
  variants: {
    tone: {
      neutral: { background: "bg.surface", color: "fg.muted", borderColor: "border.subtle" },
      gold: { background: "gold.50", color: "gold.700", borderColor: "gold.200" },
      success: {
        background: "rgba(47,107,88,0.1)",
        color: "success",
        borderColor: "rgba(47,107,88,0.25)",
      },
      danger: {
        background: "rgba(138,44,59,0.1)",
        color: "danger",
        borderColor: "rgba(138,44,59,0.25)",
      },
    },
  },
  defaultVariants: { tone: "neutral" },
});

export type StatusTone = "neutral" | "gold" | "success" | "danger";

export const statusTone = (status: string): StatusTone => {
  switch (status.toLowerCase()) {
    case "delivered":
      return "success";
    case "cancelled":
      return "danger";
    case "shipped":
    case "processing":
    case "confirmed":
      return "gold";
    default:
      return "neutral";
  }
};

export const emptyStateStyle = css({
  paddingBlock: "12",
  textAlign: "center",
});

export const sectionHeadingStyle = css({
  fontFamily: "display",
  fontSize: { base: "xl", md: "2xl" },
  fontWeight: "semibold",
  color: "fg.default",
});

export const tabPanelStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "4",
});

export const fieldStackStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "1.5",
});

export const tabIconStyle = css({ h: "4", w: "4" });
