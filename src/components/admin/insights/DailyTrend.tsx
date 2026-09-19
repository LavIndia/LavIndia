import { css, cx } from "styled-system/css";
import { formatPaisaCompact } from "@/modules/_shared/money";
import type { DayTotals } from "@/modules/analytics/sales-insights";

const chartStyle = css({
  display: "flex",
  alignItems: "flex-end",
  gap: "1",
  height: "40",
  paddingTop: "2",
});
const columnStyle = css({
  flex: "1",
  minWidth: "0.5",
  display: "flex",
  flexDirection: "column",
  justifyContent: "flex-end",
  height: "full",
  gap: "0.5",
});
const barBaseStyle = css({ borderRadius: "xs", minHeight: "0.5" });
const storeBarStyle = css({ background: "accent.default" });
const onlineBarStyle = css({ background: "gold.300" });
const axisStyle = css({
  display: "flex",
  justifyContent: "space-between",
  fontSize: "xs",
  color: "fg.muted",
  paddingTop: "2",
});
const legendStyle = css({
  display: "flex",
  alignItems: "center",
  gap: "4",
  fontSize: "xs",
  color: "fg.muted",
});
const swatchRowStyle = css({ display: "flex", alignItems: "center", gap: "1.5" });
const swatchStyle = css({ height: "2.5", width: "2.5", borderRadius: "xs" });
const emptyStyle = css({ fontSize: "sm", color: "fg.muted", paddingBlock: "4" });

/** "2026-09-19" → "19 Sep", without constructing a Date per render. */
function shortDay(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

/**
 * Takings per day, counter and web stacked.
 *
 * Drawn with plain elements rather than a charting library: it is a column
 * per day and two rectangles per column, and a dependency that ships a
 * rendering engine to do that would cost more than it gives — on a page whose
 * whole job is to load quickly.
 *
 * Every bar carries its exact figure as a tooltip, because a chart that can
 * only be read approximately is decoration.
 */
export function DailyTrend({ days }: { days: DayTotals[] }) {
  if (days.length === 0) {
    return <p className={emptyStyle}>No sales in this period.</p>;
  }

  const peak = Math.max(
    ...days.map((day) => day.storeRevenueCents + day.onlineRevenueCents),
    1,
  );

  return (
    <div>
      <div className={legendStyle}>
        <span className={swatchRowStyle}>
          <span className={cx(swatchStyle, storeBarStyle)} />
          Walk-in
        </span>
        <span className={swatchRowStyle}>
          <span className={cx(swatchStyle, onlineBarStyle)} />
          Online
        </span>
        <span>Tallest day {formatPaisaCompact(peak)}</span>
      </div>

      <div className={chartStyle}>
        {days.map((day) => {
          const total = day.storeRevenueCents + day.onlineRevenueCents;
          return (
            <div
              key={day.day}
              className={columnStyle}
              title={`${shortDay(day.day)} · walk-in ${formatPaisaCompact(
                day.storeRevenueCents,
              )} · online ${formatPaisaCompact(day.onlineRevenueCents)} · total ${formatPaisaCompact(
                total,
              )}`}
            >
              {day.onlineRevenueCents > 0 && (
                <div
                  className={cx(barBaseStyle, onlineBarStyle)}
                  style={{ height: `${(day.onlineRevenueCents / peak) * 100}%` }}
                />
              )}
              {day.storeRevenueCents > 0 && (
                <div
                  className={cx(barBaseStyle, storeBarStyle)}
                  style={{ height: `${(day.storeRevenueCents / peak) * 100}%` }}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className={axisStyle}>
        <span>{shortDay(days[0].day)}</span>
        {days.length > 1 && <span>{shortDay(days[days.length - 1].day)}</span>}
      </div>
    </div>
  );
}
