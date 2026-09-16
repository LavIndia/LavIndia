"use client";

import * as React from "react";
import {
  Checkbox as AriaCheckbox,
  type CheckboxProps as AriaCheckboxProps,
} from "react-aria-components";
import { CheckIcon, MinusIcon } from "lucide-react";
import { css, cx } from "styled-system/css";

const checkboxStyle = css({
  display: "inline-flex",
  alignItems: "center",
  gap: "2",
  cursor: "pointer",
  fontFamily: "body",
  fontSize: "sm",
  color: "fg.default",
  outline: "none",
  "& .box": {
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
    width: "4",
    height: "4",
    borderRadius: "xs",
    border: "1px solid",
    borderColor: "border.subtle",
    background: "bg.surface",
    color: "fg.onGold",
    transition: "background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease",
  },
  "& .box svg": {
    width: "3",
    height: "3",
    opacity: 0,
    transform: "scale(0.6)",
    transition: "opacity 0.12s ease, transform 0.12s ease",
  },
  "&[data-selected] .box, &[data-indeterminate] .box": {
    background: "linear-gradient(135deg, {colors.gold.300}, {colors.gold.500})",
    borderColor: "transparent",
    boxShadow: "gold",
  },
  "&[data-selected] .box svg, &[data-indeterminate] .box svg": {
    opacity: 1,
    transform: "scale(1)",
  },
  "&[data-focus-visible] .box": {
    boxShadow: "0 0 0 3px token(colors.gold.200)",
  },
  "&[data-disabled]": { cursor: "not-allowed", opacity: 0.5 },
});

export interface CheckboxProps
  extends Omit<
    AriaCheckboxProps,
    "className" | "children" | "checked" | "defaultChecked"
  > {
  className?: string;
  children?: React.ReactNode;
  /** Back-compat alias for isSelected (old Radix/shadcn API). */
  checked?: boolean;
  /** Back-compat alias for defaultSelected. */
  defaultChecked?: boolean;
  /**
   * Back-compat alias for onChange. React Aria's onChange is already a plain
   * boolean callback (unlike Radix's CheckedState which can be "indeterminate"),
   * so this maps 1:1 — indeterminate stays presentation-only via `isIndeterminate`.
   */
  onCheckedChange?: (checked: boolean) => void;
  /** Back-compat alias for isDisabled. */
  disabled?: boolean;
}

export function Checkbox({
  className,
  children,
  checked,
  defaultChecked,
  onCheckedChange,
  isSelected,
  defaultSelected,
  onChange,
  disabled,
  isDisabled,
  ...props
}: CheckboxProps) {
  return (
    <AriaCheckbox
      className={cx(checkboxStyle, className)}
      isSelected={isSelected ?? checked}
      defaultSelected={defaultSelected ?? defaultChecked}
      isDisabled={isDisabled ?? disabled}
      onChange={(value) => {
        onChange?.(value);
        onCheckedChange?.(value);
      }}
      {...props}
    >
      {({ isIndeterminate }) => (
        <>
          <span className="box">
            {isIndeterminate ? <MinusIcon /> : <CheckIcon />}
          </span>
          {children}
        </>
      )}
    </AriaCheckbox>
  );
}
