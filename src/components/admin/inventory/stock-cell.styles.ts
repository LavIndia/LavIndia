/** The look shared by the stock screen's tap-to-edit cells and their popovers. */
import { css } from "styled-system/css";

export const triggerStyle = css({
  fontVariantNumeric: "tabular-nums",
  fontWeight: "semibold",
  paddingInline: "2",
  paddingBlock: "1",
  borderRadius: "sm",
  border: "1px solid transparent",
  cursor: "pointer",
  transition: "border-color 0.15s ease, background 0.15s ease",
  "&:hover": { borderColor: "border.subtle", background: "bg.canvas" },
});

export const popoverStyle = css({
  position: "absolute",
  right: "0",
  top: "calc(100% + 6px)",
  zIndex: "50",
  width: "16rem",
  padding: "3",
  borderRadius: "md",
  border: "1px solid",
  borderColor: "border.subtle",
  background: "bg.surface",
  boxShadow: "lg",
  display: "flex",
  flexDirection: "column",
  gap: "2.5",
});

export const wrapStyle = css({ position: "relative", display: "inline-block" });
export const labelStyle = css({ fontSize: "xs", color: "fg.muted" });
export const chipRowStyle = css({ display: "flex", flexWrap: "wrap", gap: "1.5" });
export const chipStyle = css({
  fontSize: "xs",
  paddingInline: "2",
  paddingBlock: "1",
  borderRadius: "full",
  border: "1px solid",
  borderColor: "border.subtle",
  cursor: "pointer",
  transition: "background 0.15s ease, border-color 0.15s ease",
  "&:hover": { borderColor: "accent.pressed", background: "gold.50" },
});
