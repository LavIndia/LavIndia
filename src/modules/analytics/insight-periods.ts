/**
 * The periods a sales dashboard can be measured over.
 *
 * Kept apart from `sales-insights.ts` because the period chips are a client
 * component and that module builds SQL with `Prisma.sql` at module scope —
 * importing it from the browser drags the query builder into the client
 * bundle, which fails outright. Constants and date arithmetic are safe on
 * both sides; the queries are not.
 */
import { istDaysAgo, istFinancialYearStart, istStartOfDay } from "./ist-calendar";

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
 * A period key → its start, in India time.
 *
 * "Today" begins at midnight in India whatever the server's clock zone, and
 * "last 7 days" is today and the six India-time days before it. The
 * financial year runs April–March in India, which is the span an invoice
 * number is scoped to, so "this financial year" here and the invoice sequence
 * always describe the same set of sales.
 */
export function resolvePeriod(value: string, now: Date = new Date()): InsightsPeriod {
  const label = INSIGHT_PERIODS.find((period) => period.value === value)?.label ?? "Last 30 days";
  switch (value) {
    case "today":
      return { from: istStartOfDay(now), label };
    case "7d":
      return { from: istDaysAgo(now, 6), label };
    case "90d":
      return { from: istDaysAgo(now, 89), label };
    case "fy":
      return { from: istFinancialYearStart(now), label };
    case "all":
      return { from: null, label };
    default:
      return { from: istDaysAgo(now, 29), label };
  }
}
