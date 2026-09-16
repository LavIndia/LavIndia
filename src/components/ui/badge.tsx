import * as React from "react";
import { cva, cx } from "styled-system/css";
import type { RecipeVariantProps } from "styled-system/types";

const badgeStyle = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "1",
    width: "fit-content",
    whiteSpace: "nowrap",
    flexShrink: 0,
    borderRadius: "full",
    border: "1px solid",
    borderColor: "transparent",
    paddingInline: "2",
    paddingBlock: "0.5",
    fontFamily: "body",
    fontSize: "xs",
    fontWeight: "medium",
    lineHeight: "1.2",
    overflow: "hidden",
    "& svg": { flexShrink: 0, pointerEvents: "none", width: "3", height: "3" },
    "&[data-focus-visible], &:focus-visible": {
      boxShadow: "0 0 0 3px token(colors.gold.200)",
    },
  },
  variants: {
    variant: {
      default: {
        background: "linear-gradient(135deg, {colors.gold.300}, {colors.gold.500})",
        color: "fg.onGold",
      },
      secondary: {
        background: "bg.surface",
        color: "fg.default",
        borderColor: "border.subtle",
      },
      destructive: {
        background: "danger",
        color: "white",
      },
      outline: {
        background: "transparent",
        color: "fg.default",
        borderColor: "border.subtle",
      },
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export type BadgeVariants = RecipeVariantProps<typeof badgeStyle>;

export type BadgeProps = React.ComponentProps<"span"> & BadgeVariants;

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      className={cx(badgeStyle({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeStyle as badgeVariants };
