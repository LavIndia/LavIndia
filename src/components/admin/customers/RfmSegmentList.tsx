import { css } from "styled-system/css";
import { segmentLabel, type RfmSegmentSummary } from "@/modules/customers/rfm";
import { formatPaisa } from "@/modules/_shared/money";

const listStyle = css({ display: "flex", flexDirection: "column", gap: "2.5" });
const titleStyle = css({ fontSize: "sm", fontWeight: "semibold", color: "fg.default" });
const rowStyle = css({
  display: "grid",
  gridTemplateColumns: { base: "1fr", md: "minmax(0, 15rem) minmax(0, 1fr) auto" },
  alignItems: "center",
  gap: "3",
  padding: "3.5",
  borderRadius: "lg",
  border: "1px solid",
  borderColor: "border.subtle",
  background: "bg.surface",
});
const nameRowStyle = css({ display: "flex", alignItems: "center", gap: "2" });
const nameStyle = css({ fontSize: "sm", fontWeight: "medium", color: "fg.default" });
const dotStyle = css({ width: "2", height: "2", borderRadius: "full", flexShrink: 0 });
const countStyle = css({ fontSize: "xs", color: "fg.muted", fontVariantNumeric: "tabular-nums" });
const meaningStyle = css({ fontSize: "xs", color: "fg.muted", lineHeight: "relaxed" });
const actionStyle = css({ fontSize: "xs", color: "accent.pressed", lineHeight: "relaxed" });
const moneyWrapStyle = css({ textAlign: { base: "left", md: "right" }, minWidth: "0" });
const moneyStyle = css({
  fontSize: "sm",
  fontWeight: "semibold",
  color: "fg.default",
  fontVariantNumeric: "tabular-nums",
});
const shareStyle = css({ fontSize: "xs", color: "fg.muted", fontVariantNumeric: "tabular-nums" });
const emptyStyle = css({
  padding: "8",
  textAlign: "center",
  fontSize: "sm",
  color: "fg.muted",
  border: "1px dashed",
  borderColor: "border.subtle",
  borderRadius: "md",
});

const TONE_COLOUR: Record<string, string> = {
  good: "token(colors.green.500, #2f855a)",
  watch: "token(colors.gold.500)",
  risk: "token(colors.red.500, #c53030)",
};

/**
 * The segments, ordered by the money in them.
 *
 * Sorted by revenue rather than by customer count on purpose: a segment
 * holding four people and a third of the year's takings deserves to be read
 * first, and counting heads would bury it beneath a crowd of one-time
 * buyers.
 */
export function RfmSegmentList({ segments }: { segments: RfmSegmentSummary[] }) {
  if (segments.length === 0) {
    return <p className={emptyStyle}>No customers have bought anything yet.</p>;
  }

  return (
    <div className={listStyle}>
      <span className={titleStyle}>Segments, by the revenue they carry</span>
      {segments.map((summary) => {
        const label = segmentLabel(summary.segment);
        return (
          <div key={summary.segment} className={rowStyle}>
            <span>
              <span className={nameRowStyle}>
                <span
                  className={dotStyle}
                  style={{ background: TONE_COLOUR[label.tone] }}
                  aria-hidden
                />
                <span className={nameStyle}>{label.name}</span>
              </span>
              <span className={countStyle}>
                {summary.customers} customer{summary.customers === 1 ? "" : "s"}
                {summary.averageOrderValueCents > 0 &&
                  ` · ${formatPaisa(summary.averageOrderValueCents)} per order`}
              </span>
            </span>

            <span>
              <span className={meaningStyle}>{label.meaning}</span>
              <br />
              <span className={actionStyle}>{label.action}</span>
            </span>

            <span className={moneyWrapStyle}>
              <span className={moneyStyle}>{formatPaisa(summary.revenueCents)}</span>
              <br />
              <span className={shareStyle}>{(summary.revenueShare * 100).toFixed(1)}% of revenue</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
