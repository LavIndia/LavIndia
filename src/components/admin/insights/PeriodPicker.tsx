"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { css, cx } from "styled-system/css";
import { INSIGHT_PERIODS } from "@/modules/analytics/insight-periods";

const rowStyle = css({ display: "flex", gap: "1.5", flexWrap: "wrap" });
const chipStyle = css({ whiteSpace: "nowrap" });
const activeStyle = css({ borderColor: "accent.default" });

/**
 * The period every figure on the page is measured over.
 *
 * Chips rather than a dropdown: there are six, they are the whole question
 * the page is answering, and switching between them is the main thing anyone
 * does here — a dropdown would put two taps in front of every comparison.
 */
export function PeriodPicker({
  active,
  basePath = "/admin/sales-insights",
}: {
  active: string;
  /** Which screen the chips navigate within. The period is a query param, so
      the same control serves any screen measured over a period. */
  basePath?: string;
}) {
  const router = useRouter();

  return (
    <div className={rowStyle}>
      {INSIGHT_PERIODS.map((period) => (
        <Button
          key={period.value}
          variant={period.value === active ? "secondary" : "outline"}
          size="sm"
          className={cx(chipStyle, period.value === active && activeStyle)}
          onClick={() => router.push(`${basePath}?period=${period.value}`)}
        >
          {period.label}
        </Button>
      ))}
    </div>
  );
}
