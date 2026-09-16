"use client";

import * as React from "react";
import { Input as AriaInput, type InputProps as AriaInputProps } from "react-aria-components";
import { css, cx } from "styled-system/css";

const inputStyle = css({
  display: "flex",
  width: "full",
  minWidth: 0,
  height: "10",
  borderRadius: "md",
  border: "1px solid",
  borderColor: "border.subtle",
  background: "bg.surface",
  color: "fg.default",
  fontFamily: "body",
  fontSize: "sm",
  paddingInline: "3",
  paddingBlock: "1",
  outline: "none",
  transition: "border-color 0.15s ease, box-shadow 0.15s ease",
  "&::placeholder": { color: "fg.muted" },
  "&[data-hovered]": { borderColor: "border.glass" },
  "&[data-focused], &:focus-visible, &[data-focus-visible]": {
    borderColor: "accent.default",
    boxShadow: "0 0 0 3px token(colors.gold.200)",
  },
  "&[data-disabled], &:disabled": {
    opacity: 0.5,
    cursor: "not-allowed",
  },
  "&[aria-invalid='true'], &[data-invalid]": {
    borderColor: "danger",
  },
  "&::file-selector-button": {
    height: "7",
    marginRight: "3",
    border: "0",
    background: "transparent",
    fontSize: "sm",
    fontWeight: "medium",
    color: "fg.default",
  },
});

export interface InputProps
  extends Omit<AriaInputProps, "className">,
    React.RefAttributes<HTMLInputElement> {
  className?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <AriaInput
        ref={ref}
        type={type}
        data-slot="input"
        suppressHydrationWarning
        className={cx(inputStyle, className)}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
