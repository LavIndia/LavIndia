"use client";

import { ShoppingBag, Minus, Plus } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useCart } from "./useCart";
import { useMemo } from "react";
import { css, cx } from "styled-system/css";
import { trackProductEvent } from "@/lib/analytics-client";
import { useAuthDialog } from "@/components/auth/AuthDialogProvider";

const iconStyle = css({ height: "4", width: "4", marginRight: "2" });

const iconOnlyButtonStyle = css({
  color: "accent.pressed",
  "&[data-hovered], &:hover": { background: "bg.glassStrong" },
});

const iconOnlyIconStyle = css({ height: "4.5", width: "4.5" });

const stepperStyle = css({
  display: "flex",
  alignItems: "center",
  gap: "1",
  borderRadius: "full",
  background: "bg.glass",
  backdropBlur: "glassSm",
  border: "1px solid",
  borderColor: "border.glass",
  paddingInline: "1",
  height: "8",
});

const stepperButtonStyle = css({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  height: "6",
  width: "6",
  borderRadius: "full",
  color: "accent.pressed",
  cursor: "pointer",
  "&:hover": { background: "bg.glassStrong" },
  "&:disabled": { opacity: 0.4, cursor: "not-allowed" },
});

const stepperQtyStyle = css({
  minWidth: "4",
  textAlign: "center",
  fontSize: "sm",
  fontWeight: "semibold",
  color: "fg.default",
  fontVariantNumeric: "tabular-nums",
});

export type AddToCartProps = {
  id: string;
  name: string;
  price: number;
  image?: string | null;
  variantId?: string | null;
  variantLabel?: string | null;
  qty?: number;
  stock?: number;
  className?: string;
  /** Defaults to the "in cart?" default/secondary split used everywhere except where explicitly overridden (e.g. a quieter grid card). */
  variant?: ButtonProps["variant"];
  /** Periodic shine sweep, meant for a high-intent placement (the main product-page CTA, or a product card) — see Button's `shine` prop. Turns off automatically once the item is actually in the cart. */
  shine?: boolean;
  /**
   * Renders as a plain round glass icon button (a gold bag glyph, no label)
   * instead of a text pill — the quieter treatment for a product listing
   * card. Once the item is in the cart, this becomes a real +/- quantity
   * stepper (not just a checkmark) so the shopper can adjust quantity right
   * there in the grid, the same way they can on the product page.
   */
  iconOnly?: boolean;
};

export default function AddToCartButton(props: AddToCartProps) {
  const {
    id,
    name,
    price,
    image,
    variantId,
    variantLabel,
    qty = 1,
    stock = 999,
    className,
    variant,
    shine,
    iconOnly,
  } = props;
  const { addItem, updateQty, items } = useCart();
  const { requireAuth } = useAuthDialog();

  const inCartQty = useMemo(() => {
    const found = items.find(
      (x) => x.id === id && (x.variantId ?? null) === (variantId ?? null)
    );
    return found?.qty ?? 0;
  }, [items, id, variantId]);

  const isOutOfStock = stock === 0;
  const canAddMore = inCartQty < stock;

  const handleAdd = () => {
    requireAuth(() => {
      addItem({
        id,
        name,
        price,
        image: image ?? undefined,
        variantId,
        variantLabel,
        qty,
      });
      trackProductEvent({ productId: id, type: "ADD_TO_CART" });
    });
  };

  const handleIncrease = () => {
    requireAuth(() => {
      updateQty(id, inCartQty + 1, variantId);
      trackProductEvent({ productId: id, type: "ADD_TO_CART" });
    });
  };

  const label = isOutOfStock
    ? "Out of Stock"
    : !canAddMore
    ? "Max in Cart"
    : inCartQty > 0
    ? `Added (${inCartQty})`
    : "Add to cart";

  if (iconOnly) {
    if (inCartQty > 0) {
      return (
        <div className={cx(stepperStyle, className)}>
          <button
            type="button"
            className={stepperButtonStyle}
            onClick={() => updateQty(id, inCartQty - 1, variantId)}
            aria-label="Decrease quantity"
          >
            <Minus className={css({ height: "3.5", width: "3.5" })} />
          </button>
          <span className={stepperQtyStyle} aria-label={`${inCartQty} in cart`}>
            {inCartQty}
          </span>
          <button
            type="button"
            className={stepperButtonStyle}
            onClick={handleIncrease}
            disabled={!canAddMore}
            aria-label="Increase quantity"
          >
            <Plus className={css({ height: "3.5", width: "3.5" })} />
          </button>
        </div>
      );
    }

    return (
      <Button
        onClick={handleAdd}
        className={cx(iconOnlyButtonStyle, className)}
        variant="glass"
        size="icon-sm"
        shine={shine && !isOutOfStock}
        disabled={isOutOfStock}
        aria-label={label}
        title={label}
      >
        <ShoppingBag className={iconOnlyIconStyle} />
      </Button>
    );
  }

  return (
    <Button
      onClick={handleAdd}
      className={className}
      variant={variant ?? (inCartQty > 0 ? "secondary" : "default")}
      shine={shine && inCartQty === 0 && !isOutOfStock}
      disabled={isOutOfStock || !canAddMore}
    >
      <ShoppingBag className={iconStyle} />
      {label}
    </Button>
  );
}
