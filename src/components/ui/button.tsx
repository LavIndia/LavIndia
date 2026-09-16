"use client";

import * as React from "react";
import { Button as AriaButton, type ButtonProps as AriaButtonProps } from "react-aria-components";
import { css, cva, cx } from "styled-system/css";
import type { RecipeVariantProps } from "styled-system/types";

const buttonStyle = cva({
  base: {
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "2",
    whiteSpace: "nowrap",
    fontFamily: "body",
    fontWeight: "medium",
    borderRadius: "full",
    cursor: "pointer",
    outline: "none",
    overflow: "hidden",
    transition: "transform 0.12s ease, filter 0.18s ease, background 0.18s ease, box-shadow 0.18s ease",
    "&[data-pressed]": { transform: "scale(0.97)" },
    "&[data-disabled], &:disabled": { opacity: 0.45, cursor: "not-allowed", pointerEvents: "none" },
    "&[data-focus-visible], &:focus-visible": {
      boxShadow: "0 0 0 3px token(colors.gold.200)",
    },
    "& svg": { flexShrink: 0, pointerEvents: "none" },
    "& > *": { position: "relative", zIndex: "1" },
    // Diagonal specular sheen — lives on every variant (not just gold-filled)
    // so `shine` works on outline/secondary buttons too, e.g. the "Add to
    // cart" on a product grid card. Warm gold tone reads on both a filled
    // gold button and a plain light card, unlike a pure-white sheen which
    // would vanish against a light background. Invisible/inert unless a
    // variant or the `shine` prop actually triggers it.
    "&::before": {
      content: "''",
      position: "absolute",
      inset: "-40% -20%",
      background: "linear-gradient(115deg, transparent 35%, rgba(230,184,90,0.5) 48%, transparent 62%)",
      transform: "translateX(-60%)",
      transition: "transform 0.6s ease",
      pointerEvents: "none",
    },
  },
  variants: {
    variant: {
      default: {
        background: "linear-gradient(135deg, {colors.gold.300}, {colors.gold.500} 55%, {colors.gold.400})",
        color: "fg.onGold",
        boxShadow: "gold, inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -1px 2px rgba(114,88,34,0.25)",
        "&::before": {
          background: "linear-gradient(115deg, transparent 35%, rgba(255,255,255,0.55) 48%, transparent 62%)",
        },
        "&[data-hovered]::before, &:hover::before": { transform: "translateX(20%)" },
        "&[data-hovered], &:hover": { filter: "brightness(1.04)" },
      },
      glass: {
        background: "bg.glass",
        backdropBlur: "glass",
        color: "fg.default",
        border: "1px solid",
        borderColor: "border.glass",
        boxShadow: "glass",
        "&[data-hovered], &:hover": { background: "bg.glassStrong" },
      },
      outline: {
        background: "transparent",
        color: "fg.default",
        border: "1px solid",
        borderColor: "border.subtle",
        "&[data-hovered], &:hover": { borderColor: "accent.default", color: "accent.pressed" },
      },
      secondary: {
        background: "bg.surface",
        color: "fg.default",
        border: "1px solid",
        borderColor: "border.subtle",
        "&[data-hovered], &:hover": { background: "ivory.200" },
      },
      ghost: {
        background: "transparent",
        color: "fg.default",
        "&[data-hovered], &:hover": { background: "bg.surface" },
      },
      destructive: {
        background: "danger",
        color: "white",
        "&[data-hovered], &:hover": { filter: "brightness(1.08)" },
      },
      link: {
        background: "transparent",
        color: "accent.pressed",
        height: "auto",
        paddingInline: "0",
        "&[data-hovered], &:hover": { textDecoration: "underline" },
      },
    },
    size: {
      default: { fontSize: "sm", height: "10", paddingInline: "5" },
      sm: { fontSize: "xs", height: "8", paddingInline: "3.5" },
      lg: { fontSize: "md", height: "12", paddingInline: "7" },
      icon: { height: "10", width: "10", padding: "0" },
      "icon-sm": { height: "8", width: "8", padding: "0" },
      "icon-lg": { height: "12", width: "12", padding: "0" },
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

export type ButtonVariants = RecipeVariantProps<typeof buttonStyle>;

export type ButtonProps = Omit<AriaButtonProps, "className" | "children"> &
  ButtonVariants & {
  className?: string;
  children?: React.ReactNode;
  /** Render styling onto the single child element instead of a <button> (e.g. wrapping a Next.js <Link>). */
  asChild?: boolean;
  /** Back-compat alias for isDisabled. */
  disabled?: boolean;
  title?: string;
  /**
   * Plays a slow, periodic light-sweep even when not hovered — reserved for
   * a single high-intent call to action per screen (e.g. the main product
   * page "Add to cart"), never for every button, or the effect stops
   * drawing the eye and just becomes motion noise.
   */
  shine?: boolean;
};

const shineLoopStyle = css({
  "&::before": {
    animation: "ctaShine 3.6s ease-in-out infinite",
  },
});

export function Button({
  className,
  variant,
  size,
  asChild,
  disabled,
  isDisabled,
  shine,
  children,
  ...props
}: ButtonProps) {
  const classes = cx(buttonStyle({ variant, size }), shine && shineLoopStyle, className);

  if (asChild) {
    const child = React.Children.only(children) as React.ReactElement<{ className?: string }>;
    return React.cloneElement(child, {
      className: cx(classes, child.props.className),
    });
  }

  return (
    <AriaButton
      className={classes}
      isDisabled={isDisabled ?? disabled}
      {...props}
    >
      {children}
    </AriaButton>
  );
}
