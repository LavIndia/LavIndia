import type { ReactNode } from "react";
import { css } from "styled-system/css";

/**
 * The title block every admin screen opens with.
 *
 * Extracted from the per-screen headers that each re-declared the same three
 * styles, so a change to admin page furniture happens once rather than in a
 * dozen files.
 */
const headerStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "4",
  md: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
});

const titleStyle = css({
  fontFamily: "display",
  fontSize: { base: "2xl", md: "3xl" },
  fontWeight: "bold",
  letterSpacing: "tight",
  color: "fg.default",
});

const subtitleStyle = css({
  color: "fg.muted",
  marginTop: "2",
  fontSize: "sm",
});

const actionsStyle = css({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "3",
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
      <div>
        <h1 className={titleStyle}>{title}</h1>
        {/* Omitted entirely when absent, rather than leaving an empty line. */}
        {subtitle && <p className={subtitleStyle}>{subtitle}</p>}
      </div>
      {actions && <div className={actionsStyle}>{actions}</div>}
    </div>
  );
}
