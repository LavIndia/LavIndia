import { css } from "styled-system/css";
import type { RfmBoard } from "@/modules/customers/rfm";

const wrapStyle = css({ display: "flex", flexDirection: "column", gap: "3" });
const titleStyle = css({ fontSize: "sm", fontWeight: "semibold", color: "fg.default" });
const captionStyle = css({ fontSize: "xs", color: "fg.muted", lineHeight: "relaxed", maxWidth: "42rem" });

const layoutStyle = css({ display: "flex", alignItems: "stretch", gap: "2" });
const yAxisStyle = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  writingMode: "vertical-rl",
  transform: "rotate(180deg)",
  fontSize: "xs",
  color: "fg.muted",
});
const gridStyle = css({
  display: "grid",
  gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
  gap: "1",
  flex: "1",
  minWidth: "0",
});
const cellStyle = css({
  position: "relative",
  aspectRatio: "1 / 1",
  borderRadius: "sm",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "sm",
  fontVariantNumeric: "tabular-nums",
  border: "1px solid",
  borderColor: "border.subtle",
});
const xAxisStyle = css({
  display: "grid",
  gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
  gap: "1",
  fontSize: "2xs",
  color: "fg.muted",
  textAlign: "center",
});
const axisRowStyle = css({ display: "flex", gap: "2" });
const axisSpacerStyle = css({ width: "1.25rem", flexShrink: 0 });
const footNoteStyle = css({ fontSize: "xs", color: "fg.muted", textAlign: "center" });

/**
 * The shading colour, written out rather than taken from a token.
 *
 * Panda resolves `token(...)` when it compiles a `css()` call; an inline
 * style is set at runtime and never goes through that step, so a token
 * reference there produces an invalid colour and the cell silently renders
 * transparent.
 */
const GOLD = { r: 184, g: 147, b: 58 };

/**
 * The customer base as a 5×5 map.
 *
 * Recency up the side, frequency across: the top-right corner is the people
 * who buy often and bought lately, the bottom-left the ones who came once
 * and never returned. A table of the same numbers is accurate but says
 * nothing at a glance — the shape of the shading is the finding.
 */
export function RfmGrid({ grid }: { grid: RfmBoard["grid"] }) {
  const busiest = Math.max(1, ...grid.map((cell) => cell.customers));

  return (
    <div className={wrapStyle}>
      <span className={titleStyle}>Where the customers sit</span>
      <p className={captionStyle}>
        Each square is a group of customers scored one to five on how recently
        they bought and how often. Darker means more people. Weight in the
        lower-left is the warning sign: those are customers who bought once,
        a long time ago.
      </p>

      <div className={layoutStyle}>
        <span className={yAxisStyle}>Recency →</span>
        <div className={gridStyle}>
          {grid.map((cell) => {
            // Shading runs on a square root rather than a straight ratio, so
            // a single crowded square does not wash out every other one.
            const intensity = cell.customers === 0 ? 0 : Math.sqrt(cell.customers / busiest);
            return (
              <span
                key={`${cell.recency}-${cell.frequency}`}
                className={cellStyle}
                style={{
                  background:
                    intensity === 0
                      ? "transparent"
                      : `rgba(${GOLD.r}, ${GOLD.g}, ${GOLD.b}, ${(intensity * 0.85).toFixed(2)})`,
                  color: intensity > 0.55 ? "#1f1d1b" : undefined,
                  fontWeight: intensity > 0.55 ? 600 : 400,
                }}
                title={`Recency ${cell.recency}, frequency ${cell.frequency}: ${cell.customers} customer${cell.customers === 1 ? "" : "s"}`}
              >
                {cell.customers > 0 ? cell.customers : ""}
              </span>
            );
          })}
        </div>
      </div>

      <div className={axisRowStyle}>
        <span className={axisSpacerStyle} />
        <div className={xAxisStyle}>
          {[1, 2, 3, 4, 5].map((n) => (
            <span key={n}>{n}</span>
          ))}
        </div>
      </div>
      <span className={footNoteStyle}>Frequency →</span>
    </div>
  );
}
