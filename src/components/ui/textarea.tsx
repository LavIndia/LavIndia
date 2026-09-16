"use client";

import * as React from "react";
import { TextArea as AriaTextArea, type TextAreaProps as AriaTextAreaProps } from "react-aria-components";
import { css, cx } from "styled-system/css";

const textareaStyle = css({
  display: "flex",
  width: "full",
  minHeight: "16",
  borderRadius: "md",
  border: "1px solid",
  borderColor: "border.subtle",
  background: "bg.surface",
  color: "fg.default",
  fontFamily: "body",
  fontSize: "sm",
  paddingInline: "3",
  paddingBlock: "2",
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
});

export interface TextareaProps
  extends Omit<AriaTextAreaProps, "className">,
    React.RefAttributes<HTMLTextAreaElement> {
  className?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <AriaTextArea
        ref={ref}
        data-slot="textarea"
        className={cx(textareaStyle, className)}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";
