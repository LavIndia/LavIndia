"use client";

import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "./useCart";
import { useMemo } from "react";

export type AddToCartProps = {
  id: string;
  name: string;
  price: number;
  image?: string | null;
  variantId?: string | null;
  qty?: number;
  stock?: number;
  className?: string;
};

export default function AddToCartButton(props: AddToCartProps) {
  const {
    id,
    name,
    price,
    image,
    variantId,
    qty = 1,
    stock = 999,
    className,
  } = props;
  const { addItem, items } = useCart();

  const inCartQty = useMemo(() => {
    const found = items.find(
      (x) => x.id === id && (x.variantId ?? null) === (variantId ?? null)
    );
    return found?.qty ?? 0;
  }, [items, id, variantId]);

  const isOutOfStock = stock === 0;
  const canAddMore = inCartQty < stock;

  return (
    <Button
      onClick={() =>
        addItem({ id, name, price, image: image ?? undefined, variantId, qty })
      }
      className={className}
      variant={inCartQty > 0 ? "secondary" : "default"}
      disabled={isOutOfStock || !canAddMore}
    >
      <ShoppingCart className="h-4 w-4 mr-2" />
      {isOutOfStock
        ? "Out of Stock"
        : !canAddMore
        ? "Max in Cart"
        : inCartQty > 0
        ? `Added (${inCartQty})`
        : "Add to cart"}
    </Button>
  );
}
