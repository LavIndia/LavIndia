"use client";

import * as React from "react";
import {
  MenuTrigger as AriaMenuTrigger,
  Menu as AriaMenu,
  MenuItem as AriaMenuItem,
  Popover as AriaPopover,
  Separator as AriaSeparator,
  Header as AriaHeader,
  Button as AriaButton,
  type MenuItemProps as AriaMenuItemProps,
  type PopoverProps as AriaPopoverProps,
  type SeparatorProps as AriaSeparatorProps,
} from "react-aria-components";
import { css, cva, cx } from "styled-system/css";

/** Root: old Radix API took no required props here (open state lived on the trigger's own interaction). React Aria's MenuTrigger works the same uncontrolled way by default. */
export interface DropdownMenuProps {
  children?: React.ReactNode;
}

export function DropdownMenu({ children }: DropdownMenuProps) {
  return <AriaMenuTrigger>{children}</AriaMenuTrigger>;
}

export interface DropdownMenuTriggerProps {
  asChild?: boolean;
  children?: React.ReactNode;
}

export function DropdownMenuTrigger({ asChild, children }: DropdownMenuTriggerProps) {
  if (asChild) {
    return React.Children.only(children) as React.ReactElement;
  }
  return <AriaButton>{children}</AriaButton>;
}

const dropdownMenuPopoverStyle = css({
  minWidth: "48",
  maxHeight: "80",
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

export interface DropdownMenuContentProps extends Omit<AriaPopoverProps, "className" | "children"> {
  className?: string;
  children?: React.ReactNode;
  align?: "start" | "center" | "end";
}

const alignToPlacement = {
  start: "bottom start",
  center: "bottom",
  end: "bottom end",
} as const;

export function DropdownMenuContent({ className, children, align = "start", ...props }: DropdownMenuContentProps) {
  return (
    <AriaPopover
      className={cx(dropdownMenuPopoverStyle, className)}
      placement={alignToPlacement[align]}
      {...props}
    >
      <AriaMenu className={css({ display: "flex", flexDirection: "column", gap: "0.5", outline: "none" })}>
        {children}
      </AriaMenu>
    </AriaPopover>
  );
}

const dropdownMenuItemStyle = cva({
  base: {
    display: "flex",
    alignItems: "center",
    gap: "2",
    borderRadius: "md",
    paddingInline: "3",
    paddingBlock: "2",
    fontSize: "sm",
    color: "fg.default",
    cursor: "pointer",
    outline: "none",
    textDecoration: "none",
    "&[data-disabled]": { opacity: 0.5, cursor: "not-allowed" },
    "&[data-focused], &[data-hovered]": { background: "bg.surface" },
    "& svg": { flexShrink: 0, pointerEvents: "none" },
  },
  variants: {
    variant: {
      default: {},
      destructive: {
        color: "danger",
        "&[data-focused], &[data-hovered]": { background: "rgba(138, 44, 59, 0.1)" },
      },
    },
  },
  defaultVariants: { variant: "default" },
});

export interface DropdownMenuItemProps
  extends Omit<AriaMenuItemProps, "className" | "children" | "onAction" | "href"> {
  className?: string;
  children?: React.ReactNode;
  asChild?: boolean;
  variant?: "default" | "destructive";
  /** Back-compat: old Radix API used a plain DOM `onClick`; mapped onto React Aria's `onAction` (fired on select via mouse, keyboard, or touch alike). */
  onClick?: () => void;
}

export function DropdownMenuItem({
  className,
  children,
  asChild,
  variant = "default",
  onClick,
  ...props
}: DropdownMenuItemProps) {
  const classes = cx(dropdownMenuItemStyle({ variant }), className);

  if (asChild) {
    // The item's own DOM node must be the real trigger (e.g. an <a href>) so
    // that both pointer and keyboard activation work — nesting a full <Link>
    // inside a plain wrapper element would leave keyboard Enter/Space unable
    // to reach it. We lift the child's href/content onto MenuItem itself
    // instead of cloning the child, which is the pattern React Aria expects
    // for link-like menu items (this is a deliberate, documented deviation
    // from Button's asChild clone-in-place pattern).
    const child = React.Children.only(children) as React.ReactElement<{
      href?: string;
      className?: string;
      children?: React.ReactNode;
    }>;
    return (
      <AriaMenuItem
        className={classes}
        href={child.props.href}
        onAction={onClick}
        textValue={typeof child.props.children === "string" ? child.props.children : undefined}
        {...props}
      >
        {child.props.children}
      </AriaMenuItem>
    );
  }

  return (
    <AriaMenuItem className={classes} onAction={onClick} {...props}>
      {children}
    </AriaMenuItem>
  );
}

export function DropdownMenuLabel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <AriaHeader
      className={cx(css({ paddingInline: "3", paddingBlock: "1.5", fontSize: "sm", fontWeight: "medium", color: "fg.default" }), className)}
      {...props}
    />
  );
}

export function DropdownMenuSeparator({ className, ...props }: Omit<AriaSeparatorProps, "className"> & { className?: string }) {
  return (
    <AriaSeparator
      className={cx(css({ height: "1px", background: "border.subtle", marginBlock: "1.5", marginInline: "-1.5" }), className)}
      {...props}
    />
  );
}
