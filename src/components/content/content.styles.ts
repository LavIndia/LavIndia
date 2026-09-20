import { css } from "styled-system/css";

/**
 * Shared styling for the editorial and policy pages. Kept beside the shell
 * that uses it so a page file stays pure prose, and separate from that shell
 * so the measure, rhythm and hero treatment can be tuned in one place.
 */

export const pageStyle = css({ minHeight: "100vh", background: "bg.canvas" });

export const heroStyle = css({
  background: "linear-gradient(135deg, {colors.gold.300}, {colors.gold.500})",
  color: "fg.onGold",
  paddingBlock: { base: "8", md: "12" },
});

export const heroInnerStyle = css({
  maxWidth: "4xl",
  marginInline: "auto",
  paddingInline: "4",
});

export const heroTitleStyle = css({
  fontFamily: "display",
  fontSize: { base: "3xl", md: "4xl" },
  fontWeight: "bold",
  marginBottom: "2",
});

export const heroIntroStyle = css({
  fontSize: { base: "md", md: "lg" },
  color: "rgba(255,255,255,0.92)",
  maxWidth: "2xl",
});

export const updatedStyle = css({
  marginTop: "4",
  fontSize: "sm",
  color: "rgba(255,255,255,0.85)",
});

export const containerStyle = css({
  maxWidth: "4xl",
  marginInline: "auto",
  paddingInline: "4",
  paddingBlock: { base: "8", md: "12" },
});

export const breadcrumbWrapStyle = css({ marginBottom: "8" });

export const sectionStyle = css({
  "& + &": {
    marginTop: "10",
    paddingTop: "10",
    borderTop: "1px solid",
    borderColor: "border.subtle",
  },
});

export const sectionHeadingStyle = css({
  fontFamily: "display",
  fontSize: { base: "xl", md: "2xl" },
  fontWeight: "semibold",
  color: "fg.default",
  marginBottom: "4",
});

export const paragraphStyle = css({
  color: "fg.muted",
  fontSize: "md",
  lineHeight: "1.75",
  "& + &": { marginTop: "4" },
});

export const listStyle = css({
  marginTop: "4",
  display: "flex",
  flexDirection: "column",
  gap: "3",
});

export const listItemStyle = css({
  position: "relative",
  paddingLeft: "6",
  color: "fg.muted",
  fontSize: "md",
  lineHeight: "1.7",
  _before: {
    content: '""',
    position: "absolute",
    left: "0",
    top: "0.7em",
    width: "6px",
    height: "6px",
    borderRadius: "full",
    background: "accent.default",
  },
});
