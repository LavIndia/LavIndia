import * as React from "react";
import { css, cva, cx } from "styled-system/css";
import type { RecipeVariantProps } from "styled-system/types";

const cardStyle = cva({
  base: {
    borderRadius: "lg",
    color: "fg.default",
  },
  variants: {
    variant: {
      solid: {
        background: "bg.surface",
        border: "1px solid",
        borderColor: "border.subtle",
        boxShadow: "card",
      },
      glass: {
        background: "bg.glass",
        backdropBlur: "glass",
        border: "1px solid",
        borderColor: "border.glass",
        boxShadow: "glass",
      },
    },
  },
  defaultVariants: { variant: "solid" },
});

type CardVariants = RecipeVariantProps<typeof cardStyle>;

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & CardVariants
>(({ className, variant, ...props }, ref) => (
  <div ref={ref} className={cx(cardStyle({ variant }), className)} {...props} />
));
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cx(css({ display: "flex", flexDirection: "column", gap: "1.5", padding: "6" }), className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cx(
      css({ fontFamily: "display", fontSize: "xl", fontWeight: "semibold", lineHeight: "none", letterSpacing: "tight" }),
      className
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cx(css({ fontSize: "sm", color: "fg.muted" }), className)} {...props} />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cx(css({ padding: "6", paddingTop: "0" }), className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cx(css({ display: "flex", alignItems: "center", padding: "6", paddingTop: "0" }), className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
