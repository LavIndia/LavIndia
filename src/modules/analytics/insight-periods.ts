/**
 * The periods a sales dashboard can be measured over.
 *
 * Kept apart from `sales-insights.ts` because the period chips are a client
 * component and that module builds SQL with `Prisma.sql` at module scope —
 * importing it from the browser drags the query builder into the client
 * bundle, which fails outright. Constants and date arithmetic are safe on
 * both sides; the queries are not.
 */

export interface InsightsPeriod {
  /** Inclusive lower bound, or null for all time. */
  from: Date | null;
  label: string;
}

export const INSIGHT_PERIODS = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "fy", label: "This financial year" },
  { value: "all", label: "All time" },
] as const;

export type InsightPeriodValue = (typeof INSIGHT_PERIODS)[number]["value"];

/**
 * A period key → its start.
 *
 * The financial year runs April–March in India, which is the span an invoice
 * number is scoped to, so "this financial year" here and the invoice sequence
 * always describe the same set of sales.
 */
export function resolvePeriod(value: string, now: Date = new Date()): InsightsPeriod {
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const label = INSIGHT_PERIODS.find((period) => period.value === value)?.label ?? "Last 30 days";
  switch (value) {
    case "today":
      return { from: midnight, label };
    case "7d":
      return { from: new Date(midnight.getTime() - 6 * 86_400_000), label };
    case "90d":
      return { from: new Date(midnight.getTime() - 89 * 86_400_000), label };
    case "fy": {
      const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      return { from: new Date(year, 3, 1), label };
    }
    case "all":
      return { from: null, label };
    default:
      return { from: new Date(midnight.getTime() - 29 * 86_400_000), label };
  }
}
