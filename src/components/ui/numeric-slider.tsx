"use client";

import { useEffect, useId, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { css } from "styled-system/css";

/**
 * A slider paired with a box the number can be typed into.
 *
 * A slider alone is quick but imprecise: reaching 16.5 mm on a track a few
 * hundred pixels wide is fiddly, and there is no way to enter a value read
 * off a spec sheet. The box gives the exact route, the slider the quick one,
 * and both drive the same value.
 *
 * Typing is only committed on blur or Enter, because a half-typed number
 * ("1" on the way to "16") would otherwise be applied and snap whatever the
 * control drives. Out-of-range entries are clamped rather than rejected, and
 * an empty or unreadable box falls back to the value it had.
 */

const wrapStyle = css({ display: "flex", flexDirection: "column", gap: "1.5" });
const headStyle = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "2",
  fontSize: "xs",
  color: "fg.muted",
  fontVariantNumeric: "tabular-nums",
});
const boxRowStyle = css({ display: "flex", alignItems: "center", gap: "1.5" });
const inputStyle = css({
  width: "4.5rem",
  height: "7",
  paddingInline: "2",
  fontSize: "xs",
  textAlign: "right",
  fontVariantNumeric: "tabular-nums",
});
const unitStyle = css({ fontSize: "xs", color: "fg.muted", whiteSpace: "nowrap" });
const noteStyle = css({ fontSize: "xs", color: "fg.subtle", whiteSpace: "nowrap" });

export interface NumericSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  /** Shown after the box, e.g. "%" or "mm". */
  unit?: string;
  /** Decimal places the box shows, and the value is rounded to. */
  precision?: number;
  /** A short aside beside the unit, e.g. "automatic". */
  note?: string;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function NumericSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  unit,
  precision = 0,
  note,
}: NumericSliderProps) {
  const id = useId();
  const [draft, setDraft] = useState(() => value.toFixed(precision));

  // The value can move without the box being touched — the slider, a reset
  // button, a change of label size — so the box follows it whenever it is
  // not mid-edit.
  useEffect(() => {
    setDraft(value.toFixed(precision));
  }, [value, precision]);

  const commit = () => {
    const parsed = Number.parseFloat(draft);
    if (!Number.isFinite(parsed)) {
      setDraft(value.toFixed(precision));
      return;
    }
    const snapped = clamp(Math.round(parsed / step) * step, min, max);
    setDraft(snapped.toFixed(precision));
    if (snapped !== value) onChange(snapped);
  };

  return (
    <div className={wrapStyle}>
      <div className={headStyle}>
        <Label htmlFor={`${id}-slider`}>{label}</Label>
        <span className={boxRowStyle}>
          {note && <span className={noteStyle}>{note}</span>}
          <Input
            id={`${id}-box`}
            type="number"
            inputMode="decimal"
            min={min}
            max={max}
            step={step}
            value={draft}
            aria-label={`${label} value`}
            className={inputStyle}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commit();
              }
            }}
          />
          {unit && <span className={unitStyle}>{unit}</span>}
        </span>
      </div>
      <Slider
        id={`${id}-slider`}
        aria-label={label}
        minValue={min}
        maxValue={max}
        step={step}
        value={[value]}
        onChange={(next) => onChange((next as number[])[0])}
      />
    </div>
  );
}
