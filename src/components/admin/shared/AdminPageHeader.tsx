import type { ReactNode } from "react";
import { css } from "styled-system/css";

/**
 * The title block every admin screen opens with.
 *
 * Extracted from the per-screen headers that each re-declared the same three
 * styles, so a change to admin page furniture happens once rather than in a
 * dozen files.
 */
/**
 * A row at every width, including on a phone. Stacking the title above the
 * actions and letting the actions wrap cost three rows of vertical space
 * before any content appeared — on a 390px screen that was most of the first
 * view. The title shrinks and the actions do not, so a screen with more than
 * one action folds the extras away itself (see ProductsHeader).
 */
const headerStyle = css({
  display: "flex",
  flexDirection: "row",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "3",
  md: { alignItems: "flex-end", gap: "4" },
});

const titleStyle = css({
  fontFamily: "display",
  fontSize: { base: "2xl", md: "3xl" },
  fontWeight: "bold",
  letterSpacing: "tight",
  color: "fg.default",
});

const titleColStyle = css({ minWidth: "0", flex: "1" });

const subtitleStyle = css({
  color: "fg.muted",
  marginTop: { base: "1", md: "2" },
  fontSize: { base: "xs", md: "sm" },
});

const actionsStyle = css({
  display: "flex",
  flexShrink: "0",
  alignItems: "center",
  gap: { base: "2", md: "3" },
});

export function AdminPageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className={headerStyle}>
      <div className={titleColStyle}>
        <h1 className={titleStyle}>{title}</h1>
        {/* Omitted entirely when absent, rather than leaving an empty line. */}
        {subtitle && <p className={subtitleStyle}>{subtitle}</p>}
      </div>
      {actions && <div className={actionsStyle}>{actions}</div>}
    </div>
  );
}
