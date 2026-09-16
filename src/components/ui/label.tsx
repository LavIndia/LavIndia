"use client";

import * as React from "react";
import { Label as AriaLabel, type LabelProps as AriaLabelProps } from "react-aria-components";
import { css, cx } from "styled-system/css";

const labelStyle = css({
  display: "flex",
  alignItems: "center",
  gap: "2",
  fontFamily: "body",
  fontSize: "sm",
  fontWeight: "medium",
  lineHeight: "none",
  color: "fg.default",
  userSelect: "none",
  "[data-disabled='true'] &, .group[data-disabled='true'] &": {
    pointerEvents: "none",
    opacity: 0.5,
  },
  "&:has(+ :disabled), &:has(+ [data-disabled])": {
    cursor: "not-allowed",
    opacity: 0.5,
  },
});

export interface LabelProps
  extends Omit<AriaLabelProps, "className">,
    React.RefAttributes<HTMLLabelElement> {
  className?: string;
}

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, ...props }, ref) => {
    return (
      <AriaLabel
        ref={ref}
        data-slot="label"
        className={cx(labelStyle, className)}
        {...props}
      />
    );
  }
);
Label.displayName = "Label";
