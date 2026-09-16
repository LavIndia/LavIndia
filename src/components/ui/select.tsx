"use client";

import * as React from "react";
import {
  Select as AriaSelect,
  SelectValue as AriaSelectValue,
  Button as AriaButton,
  Popover as AriaPopover,
  ListBox as AriaListBox,
  ListBoxItem as AriaListBoxItem,
  type SelectProps as AriaSelectProps,
  type ButtonProps as AriaButtonProps,
  type SelectValueProps as AriaSelectValueProps,
  type PopoverProps as AriaPopoverProps,
  type ListBoxItemProps as AriaListBoxItemProps,
  type Key,
} from "react-aria-components";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { css, cva, cx } from "styled-system/css";

/**
 * Backward-compatible, shadcn-shaped wrapper around React Aria's Select.
 * Old Radix API used `value`/`onValueChange` (strings); React Aria's Select
 * uses `selectedKey`/`onSelectionChange` (Key = string | number), so this
 * component bridges the two instead of forcing every call site to migrate.
 */
export interface SelectProps
  extends Omit<AriaSelectProps, "className" | "children" | "selectedKey" | "onSelectionChange"> {
  className?: string;
  children?: React.ReactNode;
  value?: string;
  onValueChange?: (value: string) => void;
  /** Back-compat alias for isDisabled. */
  disabled?: boolean;
  /** Back-compat alias for isRequired. */
  required?: boolean;
}

export function Select({
  className,
  children,
  value,
  onValueChange,
  disabled,
  isDisabled,
  required,
  isRequired,
  ...props
}: SelectProps) {
  return (
    <AriaSelect
      className={cx(css({ display: "flex", flexDirection: "column", gap: "1.5", width: "fit-content" }), className)}
      selectedKey={value ?? null}
      onSelectionChange={(key: Key | null) => onValueChange?.(key == null ? "" : String(key))}
      isDisabled={isDisabled ?? disabled}
      isRequired={isRequired ?? required}
      {...props}
    >
      {children}
    </AriaSelect>
  );
}

const selectTriggerStyle = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "2",
    width: "full",
    minWidth: "32",
    borderRadius: "lg",
    border: "1px solid",
    borderColor: "border.subtle",
    background: "bg.surface",
    color: "fg.default",
    fontFamily: "body",
    fontSize: "sm",
    paddingInline: "3.5",
    cursor: "pointer",
    outline: "none",
    transition: "border-color 0.15s ease, box-shadow 0.15s ease",
    "&[data-disabled]": { opacity: 0.5, cursor: "not-allowed" },
    "&[data-hovered]": { borderColor: "accent.default" },
    "&[data-pressed], &[data-open]": { borderColor: "accent.default" },
    "&[data-focus-visible]": { boxShadow: "0 0 0 3px token(colors.gold.200)", borderColor: "accent.default" },
    "& svg": { flexShrink: 0, pointerEvents: "none", color: "fg.muted" },
  },
  variants: {
    size: {
      default: { height: "10" },
      sm: { height: "8", fontSize: "xs" },
    },
  },
  defaultVariants: { size: "default" },
});

export interface SelectTriggerProps extends Omit<AriaButtonProps, "className" | "children"> {
  className?: string;
  children?: React.ReactNode;
  size?: "default" | "sm";
  suppressHydrationWarning?: boolean;
}

export function SelectTrigger({ className, size, children, ...props }: SelectTriggerProps) {
  return (
    <AriaButton className={cx(selectTriggerStyle({ size }), className)} {...props}>
      {children}
      <ChevronDownIcon size={16} aria-hidden />
    </AriaButton>
  );
}

const selectValueStyle = css({
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  textAlign: "left",
});

export interface SelectValueProps<T extends object = object>
  extends Omit<AriaSelectValueProps<T>, "className" | "children"> {
  className?: string;
  placeholder?: string;
  /** Static override content (e.g. a status badge) instead of the auto-rendered selected text. */
  children?: React.ReactNode;
}

export function SelectValue<T extends object = object>({
  className,
  placeholder,
  children,
  ...props
}: SelectValueProps<T>) {
  return (
    <AriaSelectValue className={cx(selectValueStyle, className)} {...props}>
      {children ??
        (({ isPlaceholder, selectedText }) => (isPlaceholder ? placeholder ?? "Select an option" : selectedText))}
    </AriaSelectValue>
  );
}

const selectPopoverStyle = css({
  minWidth: "40",
  maxHeight: "72",
  overflowY: "auto",
  borderRadius: "xl",
  border: "1px solid",
  borderColor: "border.glass",
  background: "bg.glassStrong",
  backdropBlur: "glass",
  boxShadow: "glassLg",
  padding: "1.5",
  zIndex: "50",
  opacity: 1,
  transform: "scale(1) translateY(0)",
  transition: "opacity 0.12s ease, transform 0.12s ease",
  "&[data-entering]": { opacity: 0, transform: "scale(0.98) translateY(-4px)" },
  "&[data-exiting]": { opacity: 0 },
});

export interface SelectContentProps extends Omit<AriaPopoverProps, "className" | "children"> {
  className?: string;
  children?: React.ReactNode;
}

export function SelectContent({ className, children, ...props }: SelectContentProps) {
  return (
    <AriaPopover className={cx(selectPopoverStyle, className)} placement="bottom start" {...props}>
      <AriaListBox className={css({ display: "flex", flexDirection: "column", gap: "0.5" })}>
        {children}
      </AriaListBox>
    </AriaPopover>
  );
}

const selectItemStyle = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "2",
  borderRadius: "md",
  paddingInline: "3",
  paddingBlock: "2",
  fontSize: "sm",
  color: "fg.default",
  cursor: "pointer",
  outline: "none",
  "&[data-disabled]": { opacity: 0.5, cursor: "not-allowed" },
  "&[data-focused], &[data-hovered]": { background: "bg.surface" },
  "&[data-selected]": { color: "accent.pressed", fontWeight: "medium" },
  "& svg": { flexShrink: 0, pointerEvents: "none" },
});

export interface SelectItemProps extends Omit<AriaListBoxItemProps, "className" | "id" | "value" | "children"> {
  className?: string;
  value: string;
  children?: React.ReactNode;
}

export function SelectItem({ className, value, children, ...props }: SelectItemProps) {
  return (
    <AriaListBoxItem id={value} className={cx(selectItemStyle, className)} textValue={typeof children === "string" ? children : undefined} {...props}>
      {({ isSelected }) => (
        <>
          <span>{children}</span>
          {isSelected && <CheckIcon size={16} aria-hidden />}
        </>
      )}
    </AriaListBoxItem>
  );
}
