import * as React from "react";
import { css, cva, cx } from "styled-system/css";
import type { RecipeVariantProps } from "styled-system/types";

const alertStyle = cva({
  base: {
    position: "relative",
    width: "100%",
    borderRadius: "lg",
    border: "1px solid",
    borderColor: "border.subtle",
    paddingInline: "4",
    paddingBlock: "3",
    fontFamily: "body",
    fontSize: "sm",
    display: "grid",
    gridTemplateColumns: "0 1fr",
    columnGap: "3",
    rowGap: "0.5",
    alignItems: "start",
    "&:has(> svg)": { gridTemplateColumns: "4 1fr" },
    "& svg": { width: "4", height: "4", transform: "translateY(2px)", color: "currentColor" },
  },
  variants: {
    variant: {
      default: {
        background: "bg.surface",
        color: "fg.default",
      },
      destructive: {
        background: "bg.surface",
        color: "danger",
      },
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export type AlertVariants = RecipeVariantProps<typeof alertStyle>;

export type AlertProps = React.ComponentProps<"div"> & AlertVariants;

function Alert({ className, variant, ...props }: AlertProps) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cx(alertStyle({ variant }), className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cx(
        css({
          gridColumnStart: "2",
          minHeight: "4",
          fontFamily: "body",
          fontWeight: "medium",
          letterSpacing: "tight",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }),
        className
      )}
      {...props}
    />
  );
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cx(
        css({
          gridColumnStart: "2",
          display: "grid",
          justifyItems: "start",
          gap: "1",
          fontSize: "sm",
          color: "fg.muted",
          "& p": { lineHeight: "relaxed" },
        }),
        className
      )}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription };
