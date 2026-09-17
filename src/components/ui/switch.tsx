"use client";

import * as React from "react";
import {
  Switch as AriaSwitch,
  type SwitchProps as AriaSwitchProps,
} from "react-aria-components";
import { css, cx } from "styled-system/css";

const switchStyle = css({
  display: "inline-flex",
  alignItems: "center",
  cursor: "pointer",
  outline: "none",
  "& .track": {
    display: "inline-flex",
    alignItems: "center",
    flexShrink: 0,
    width: "8",
    height: "4.5",
    padding: "0.5",
    borderRadius: "full",
    background: "border.subtle",
    border: "1px solid transparent",
    transition: "background 0.18s ease",
    // Decorative only — pointer-events must fall through to the real
    // (visually hidden) <input> underneath, otherwise clicks/taps on the
    // visible track never reach the input and the switch is inert.
    pointerEvents: "none",
  },
  "& .thumb": {
    width: "3.5",
    height: "3.5",
    borderRadius: "full",
    background: "bg.surface",
    boxShadow: "card",
    transform: "translateX(0)",
    transition: "transform 0.18s ease, background 0.18s ease",
    pointerEvents: "none",
  },
  "&[data-selected] .track": {
    background: "linear-gradient(135deg, {colors.gold.300}, {colors.gold.500})",
  },
  "&[data-selected] .thumb": {
    // track (8) minus its own padding (0.5 * 2) minus thumb width (3.5) = 3.5
    transform: "translateX(token(sizes.3.5))",
  },
  "&[data-focus-visible] .track": {
    boxShadow: "0 0 0 3px token(colors.gold.200)",
  },
  "&[data-disabled]": { cursor: "not-allowed", opacity: 0.5 },
});

export interface SwitchProps
  extends Omit<
    AriaSwitchProps,
    "className" | "children" | "checked" | "defaultChecked"
  > {
  className?: string;
  children?: React.ReactNode;
  /** Back-compat alias for isSelected (old Radix/shadcn API). */
  checked?: boolean;
  /** Back-compat alias for defaultSelected. */
  defaultChecked?: boolean;
  /** Back-compat alias for onChange. */
  onCheckedChange?: (checked: boolean) => void;
  /** Back-compat alias for isDisabled. */
  disabled?: boolean;
}

export function Switch({
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
}: SwitchProps) {
  return (
    <AriaSwitch
      className={cx(switchStyle, className)}
      isSelected={isSelected ?? checked}
      defaultSelected={defaultSelected ?? defaultChecked}
      isDisabled={isDisabled ?? disabled}
      onChange={(value) => {
        onChange?.(value);
        onCheckedChange?.(value);
      }}
      {...props}
    >
      <span className="track">
        <span className="thumb" />
      </span>
      {children}
    </AriaSwitch>
  );
}
