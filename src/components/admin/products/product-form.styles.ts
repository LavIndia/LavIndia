import { css } from "styled-system/css";

/**
 * Styling for the product form and everything it is built from.
 *
 * Lifted out of the form unchanged so that the cards, the option chips and
 * the variant gallery can be separate files without any of them redefining
 * a border radius or a chip colour slightly differently.
 */

export const requiredMarkStyle = css({ color: "danger", marginLeft: "0.5" });
export const fieldStyle = css({ display: "flex", flexDirection: "column", gap: "2" });
export const fieldGrid3Style = css({
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "4",
  sm: { gridTemplateColumns: "repeat(3, 1fr)" },
});
export const fieldGrid2Style = css({
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "4",
  sm: { gridTemplateColumns: "repeat(2, 1fr)" },
});

export const layoutStyle = css({
  display: "grid",
  gridTemplateColumns: { base: "1fr", lg: "1fr 21rem" },
  gap: "6",
  alignItems: "start",
});

export const actionBarStyle = css({
  position: "sticky",
  top: "0",
  zIndex: "40",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "4",
  flexWrap: "wrap",
  marginBottom: "6",
  paddingBlock: "3",
  paddingInline: "4",
  borderRadius: "xl",
  border: "1px solid",
  borderColor: "border.glass",
  background: "bg.glassStrong",
  backdropBlur: "glass",
  boxShadow: "glassLg",
});

export const actionBarButtonsStyle = css({ display: "flex", alignItems: "center", gap: "2" });

export const mainColumnStyle = css({ display: "flex", flexDirection: "column", gap: "6" });
export const sidebarColumnStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "4",
  lg: { position: "sticky", top: "6" },
});

export const checklistItemStyle = css({ display: "flex", alignItems: "center", gap: "2", fontSize: "sm" });
export const checklistDoneStyle = css({ color: "fg.default" });
export const checklistPendingStyle = css({ color: "fg.muted" });

export const optionRowStyle = css({ display: "flex", flexDirection: "column", gap: "2" });
export const optionInputRowStyle = css({ display: "flex", gap: "2" });
export const chipsWrapStyle = css({ display: "flex", flexWrap: "wrap", gap: "1.5" });
export const chipStyle = css({
  display: "inline-flex",
  alignItems: "center",
  gap: "1",
  background: "gold.50",
  color: "gold.700",
  border: "1px solid",
  borderColor: "gold.200",
  borderRadius: "full",
  paddingInline: "2.5",
  paddingBlock: "1",
  fontSize: "xs",
  fontWeight: "medium",
});
export const chipRemoveStyle = css({
  cursor: "pointer",
  display: "inline-flex",
  "&:hover": { color: "danger" },
});

export const curatedPillStyle = css({
  display: "inline-flex",
  alignItems: "center",
  gap: "1.5",
  background: "bg.surface",
  color: "fg.muted",
  border: "1px solid",
  borderColor: "border.subtle",
  borderRadius: "full",
  paddingInline: "2.5",
  paddingBlock: "1",
  fontSize: "xs",
  fontWeight: "medium",
  cursor: "pointer",
  transition: "background 0.15s ease, border-color 0.15s ease, color 0.15s ease",
  "&:hover": { borderColor: "accent.default" },
});
export const curatedPillActiveStyle = css({
  background: "gold.50",
  color: "gold.700",
  borderColor: "gold.300",
});
export const colorSwatchStyle = css({
  display: "inline-block",
  height: "2.5",
  width: "2.5",
  borderRadius: "full",
  border: "1px solid",
  borderColor: "border.subtle",
});

export const variantIdentifierRowStyle = css({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "2",
  fontSize: "xs",
  color: "fg.muted",
});

export const variantIdentifierChipStyle = css({
  display: "inline-flex",
  alignItems: "center",
  gap: "1.5",
  borderRadius: "full",
  border: "1px solid",
  borderColor: "border.subtle",
  background: "bg.surface",
  paddingInline: "2",
  paddingBlock: "0.5",
  fontFamily: "mono",
  fontSize: "2xs",
  letterSpacing: "0.02em",
});

export const variantIdentifierLabelStyle = css({
  fontFamily: "body",
  fontWeight: "semibold",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "fg.muted",
  opacity: 0.8,
});

export const variantHintStyle = css({
  fontSize: "xs",
  color: "fg.muted",
});

export const tableWrapStyle = css({
  borderRadius: "lg",
  border: "1px solid",
  borderColor: "border.subtle",
  background: "bg.surface",
  overflowX: "auto",
});

export const coverCellThumbStyle = css({
  height: "10",
  width: "10",
  borderRadius: "md",
  objectFit: "cover",
  display: "block",
  border: "1px solid",
  borderColor: "border.subtle",
});

export const coverCellEmptyStyle = css({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  height: "10",
  width: "10",
  borderRadius: "md",
  border: "1px dashed",
  borderColor: "border.subtle",
  color: "fg.muted",
});

export const onHandStyle = css({
  fontSize: "sm",
  color: "fg.default",
  fontVariantNumeric: "tabular-nums",
});

export const groupTabsStyle = css({
  display: "flex",
  flexWrap: "wrap",
  gap: "2",
  borderBottom: "1px solid",
  borderColor: "border.subtle",
  paddingBottom: "3",
});

export const groupTabStyle = css({
  display: "inline-flex",
  alignItems: "center",
  gap: "1.5",
  borderRadius: "full",
  border: "1px solid",
  borderColor: "border.subtle",
  background: "bg.surface",
  paddingInline: "3",
  paddingBlock: "1.5",
  fontSize: "sm",
  fontWeight: "medium",
  color: "fg.default",
  cursor: "pointer",
  transition: "border-color 0.15s ease, background 0.15s ease",
  "&:hover": { borderColor: "accent.default" },
  "&:focus-visible": { outline: "2px solid", outlineColor: "accent.default", outlineOffset: "2px" },
});

export const groupTabActiveStyle = css({
  background: "gold.50",
  borderColor: "gold.300",
  color: "gold.700",
});

export const groupTabCountStyle = css({
  borderRadius: "full",
  background: "bg.canvas",
  border: "1px solid",
  borderColor: "border.subtle",
  paddingInline: "1.5",
  fontSize: "2xs",
  color: "fg.muted",
  fontVariantNumeric: "tabular-nums",
});
