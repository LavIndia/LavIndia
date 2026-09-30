import { css } from "styled-system/css";

export const cardBody = css({ display: "flex", flexDirection: "column", gap: "4" });
export const field = css({ display: "flex", flexDirection: "column", gap: "1.5", minWidth: 0 });
export const grid2 = css({
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "4",
  sm: { gridTemplateColumns: "1fr 1fr" },
});
export const grid3 = css({
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "4",
  sm: { gridTemplateColumns: "repeat(3, 1fr)" },
});
export const hint = css({ fontSize: "xs", color: "fg.muted" });
export const sentence = css({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "2",
  fontSize: "sm",
  color: "fg.default",
  lineHeight: "2",
});
export const inlineNumber = css({ width: "20" });
export const inlineMoney = css({ width: "32" });
export const toggleRow = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "4",
  borderRadius: "lg",
  border: "1px solid",
  borderColor: "border.subtle",
  padding: "3",
});
export const chipRow = css({ display: "flex", flexWrap: "wrap", gap: "2" });
export const pill = (active: boolean) =>
  css({
    borderRadius: "full",
    border: "1px solid",
    borderColor: active ? "accent.default" : "border.subtle",
    background: active ? "gold.50" : "bg.surface",
    color: "fg.default",
    paddingInline: "3",
    paddingBlock: "1",
    fontSize: "sm",
    cursor: "pointer",
    _dark: { background: active ? "bg.canvas" : "bg.surface" },
    _focusVisible: { outline: "2px solid", outlineColor: "accent.default" },
  });
export const cardNumber = css({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "6",
  height: "6",
  borderRadius: "full",
  background: "gold.50",
  color: "gold.700",
  fontSize: "xs",
  fontWeight: "semibold",
  marginRight: "2",
  _dark: { background: "bg.canvas", color: "gold.200" },
});
