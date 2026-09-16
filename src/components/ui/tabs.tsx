"use client";

import * as React from "react";
import {
  Tabs as AriaTabs,
  TabList as AriaTabList,
  Tab as AriaTab,
  TabPanel as AriaTabPanel,
  type TabsProps as AriaTabsProps,
  type TabListProps as AriaTabListProps,
  type TabProps as AriaTabProps,
  type TabPanelProps as AriaTabPanelProps,
} from "react-aria-components";
import { css, cx } from "styled-system/css";

/**
 * Back-compat note: call sites use the old Radix API (`value`/`defaultValue` on
 * <Tabs>, `value` per <TabsTrigger>/<TabsContent>). React Aria's Tabs keys tab
 * panels/triggers by `id`, and selection by `selectedKey`/`defaultSelectedKey`.
 * We map the old prop names onto React Aria's so existing call sites need no changes.
 */

export interface TabsProps
  extends Omit<AriaTabsProps, "className" | "children" | "selectedKey" | "defaultSelectedKey" | "onSelectionChange"> {
  className?: string;
  children?: React.ReactNode;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}

function Tabs({
  className,
  value,
  defaultValue,
  onValueChange,
  children,
  ...props
}: TabsProps) {
  return (
    <AriaTabs
      className={cx(css({ display: "flex", flexDirection: "column", gap: "2" }), className)}
      selectedKey={value}
      defaultSelectedKey={defaultValue}
      onSelectionChange={(key) => onValueChange?.(String(key))}
      {...props}
    >
      {children}
    </AriaTabs>
  );
}

export interface TabsListProps extends Omit<AriaTabListProps<object>, "className" | "children"> {
  className?: string;
  children?: React.ReactNode;
}

function TabsList({ className, children, ...props }: TabsListProps) {
  return (
    <AriaTabList
      className={cx(
        css({
          display: "inline-flex",
          height: "9",
          width: "fit-content",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "lg",
          background: "bg.surface",
          border: "1px solid",
          borderColor: "border.subtle",
          padding: "0.75",
          gap: "1",
        }),
        className
      )}
      {...props}
    >
      {children}
    </AriaTabList>
  );
}

export interface TabsTriggerProps extends Omit<AriaTabProps, "className" | "id" | "value"> {
  className?: string;
  children?: React.ReactNode;
  /** Back-compat alias for React Aria's `id`. */
  value: string;
}

function TabsTrigger({ className, value, children, ...props }: TabsTriggerProps) {
  return (
    <AriaTab
      id={value}
      className={cx(
        css({
          display: "inline-flex",
          flex: "1",
          alignItems: "center",
          justifyContent: "center",
          gap: "1.5",
          borderRadius: "md",
          paddingInline: "3",
          paddingBlock: "1.5",
          fontSize: "sm",
          fontFamily: "body",
          fontWeight: "medium",
          color: "fg.muted",
          cursor: "pointer",
          outline: "none",
          whiteSpace: "nowrap",
          transition: "background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease",
          "&[data-hovered]": { color: "fg.default" },
          "&[data-focus-visible]": { boxShadow: "0 0 0 3px token(colors.gold.200)" },
          "&[data-disabled]": { opacity: 0.45, cursor: "not-allowed" },
          "&[data-selected]": {
            background: "bg.canvas",
            color: "accent.pressed",
            boxShadow: "card",
          },
          "& svg": { flexShrink: 0, pointerEvents: "none" },
        }),
        className
      )}
      {...props}
    >
      {children}
    </AriaTab>
  );
}

export interface TabsContentProps extends Omit<AriaTabPanelProps, "className" | "id" | "value"> {
  className?: string;
  children?: React.ReactNode;
  /** Back-compat alias for React Aria's `id`. */
  value: string;
}

function TabsContent({ className, value, children, ...props }: TabsContentProps) {
  return (
    <AriaTabPanel
      id={value}
      className={cx(css({ flex: "1", outline: "none" }), className)}
      {...props}
    >
      {children}
    </AriaTabPanel>
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
