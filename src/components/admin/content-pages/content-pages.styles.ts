import { css } from "styled-system/css";

/** Shared styling for the page-content editor. */

export const formStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "6",
});

export const cardStyle = css({
  borderRadius: "lg",
  border: "1px solid",
  borderColor: "border.subtle",
  background: "bg.surface",
  padding: { base: "4", md: "6" },
});

export const fieldGridStyle = css({
  display: "grid",
  gridTemplateColumns: { base: "1fr", md: "1fr 1fr" },
  gap: "4",
});

export const fieldStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "2",
});

export const hintStyle = css({
  fontSize: "xs",
  color: "fg.muted",
});

export const sectionHeaderStyle = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "3",
  marginBottom: "4",
});

export const sectionIndexStyle = css({
  fontSize: "xs",
  fontWeight: "semibold",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "fg.muted",
});

export const sectionActionsStyle = css({
  display: "flex",
  gap: "2",
});

export const toolbarStyle = css({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "4",
});

export const publishRowStyle = css({
  display: "flex",
  alignItems: "center",
  gap: "3",
});

export const issueListStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "1",
  marginTop: "3",
  color: "danger",
  fontSize: "sm",
});
