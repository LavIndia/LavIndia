"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { css, cx } from "styled-system/css";
import { toPaise, toRupees } from "./promotion-draft";

const wrap = css({ position: "relative", display: "inline-flex", alignItems: "center" });
const symbol = css({ position: "absolute", left: "3", color: "fg.muted", fontSize: "sm", pointerEvents: "none" });
const input = css({ paddingLeft: "7 !important", fontVariantNumeric: "tabular-nums" });

/**
 * Rupees on screen, paise in the draft. Keeps what the admin is typing
 * ("12.") until it is a number, so a decimal point is never eaten.
 */
export function MoneyInput({
  id,
  value,
  onChange,
  className,
  placeholder,
  ariaLabel,
}: {
  id: string;
  value: number | null | undefined;
  onChange: (paise: number | null) => void;
  className?: string;
  placeholder?: string;
  ariaLabel?: string;
}) {
  const [text, setText] = useState(toRupees(value));
  useEffect(() => {
    if (toPaise(text) !== (value ?? null)) setText(toRupees(value));
    // Only an outside change to the value should replace what is typed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <span className={cx(wrap, className)}>
      <span className={symbol} aria-hidden>
        ₹
      </span>
      <Input
        id={id}
        aria-label={ariaLabel}
        inputMode="decimal"
        className={input}
        value={text}
        placeholder={placeholder}
        onChange={(e) => {
          setText(e.target.value);
          onChange(toPaise(e.target.value));
        }}
      />
    </span>
  );
}

/** A whole-number input that reports null when cleared. */
export function CountInput({
  id,
  value,
  onChange,
  className,
  min = 1,
  ariaLabel,
  placeholder,
}: {
  id: string;
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  className?: string;
  min?: number;
  ariaLabel?: string;
  placeholder?: string;
}) {
  return (
    <Input
      id={id}
      aria-label={ariaLabel}
      type="number"
      min={min}
      inputMode="numeric"
      className={cx(css({ fontVariantNumeric: "tabular-nums" }), className)}
      value={value ?? ""}
      placeholder={placeholder}
      onChange={(e) => {
        const n = parseInt(e.target.value, 10);
        onChange(Number.isFinite(n) ? n : null);
      }}
    />
  );
}
