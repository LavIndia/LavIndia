"use client";

import { useState } from "react";
import { ShoppingCart, Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import Image from "next/image";
import { useCart } from "./useCart";
import Link from "next/link";
import { css } from "styled-system/css";

const badgeStyle = css({
  position: "absolute",
  top: "-1",
  right: "-1",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "full",
  background: "linear-gradient(135deg, {colors.gold.300}, {colors.gold.500})",
  color: "fg.onGold",
  fontSize: "10px",
  fontWeight: "semibold",
  height: "4",
  minWidth: "4",
  paddingInline: "1",
});

const bodyStyle = css({
  marginTop: "6",
  display: "flex",
  flexDirection: "column",
  height: "calc(100% - 5rem)",
});

const emptyStyle = css({ fontSize: "sm", color: "fg.muted" });

const listStyle = css({ flex: "1", overflow: "auto", display: "flex", flexDirection: "column", gap: "4", paddingRight: "2" });

const itemRowStyle = css({
  display: "flex",
  gap: "3",
  borderBottom: "1px solid",
  borderColor: "border.subtle",
  paddingBottom: "3",
});

const itemImageStyle = css({ borderRadius: "md", objectFit: "cover", width: "16", height: "16" });
const itemImagePlaceholderStyle = css({ width: "16", height: "16", background: "bg.surface", borderRadius: "md" });
const itemInfoStyle = css({ flex: "1", minWidth: "0" });
const itemTopRowStyle = css({ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "2" });
const itemNameStyle = css({ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: "medium", color: "fg.default" });
const itemPriceStyle = css({ fontSize: "sm", color: "fg.muted" });
const qtyRowStyle = css({ marginTop: "2", display: "flex", alignItems: "center", gap: "2" });
const qtyInputStyle = css({ height: "8", width: "14", textAlign: "center" });

const footerStyle = css({
  paddingTop: "4",
  borderTop: "1px solid",
  borderColor: "border.subtle",
  display: "flex",
  flexDirection: "column",
  gap: "3",
});
const subtotalRowStyle = css({ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "sm" });
const subtotalValueStyle = css({ fontFamily: "display", fontWeight: "semibold", color: "fg.default" });
const footerButtonsStyle = css({ display: "flex", gap: "2" });

export default function CartSheet() {
  const [open, setOpen] = useState(false);
  const { items, totalCount, totalPrice, updateQty, removeItem, clear } =
    useCart();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className={css({ position: "relative" })}>
          <ShoppingCart className={css({ height: "4", width: "4" })} />
          {totalCount > 0 && <span className={badgeStyle}>{totalCount}</span>}
          <span className={css({ srOnly: true })}>Cart</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className={css({ width: { base: "100vw", sm: "480px" }, maxWidth: "26rem" })}>
        <SheetHeader>
          <SheetTitle>Your Cart</SheetTitle>
        </SheetHeader>
        <div className={bodyStyle}>
          {/* Items */}
          <div className={listStyle}>
            {items.length === 0 && <div className={emptyStyle}>Your cart is empty.</div>}
            {items.map((item) => (
              <div key={`${item.id}:${item.variantId ?? "_"}`} className={itemRowStyle}>
                {item.image ? (
                  <Image
                    src={item.image}
                    alt={item.name}
                    width={64}
                    height={64}
                    className={itemImageStyle}
                  />
                ) : (
                  <div className={itemImagePlaceholderStyle} />
                )}
                <div className={itemInfoStyle}>
                  <div className={itemTopRowStyle}>
                    <div>
                      <div className={itemNameStyle}>{item.name}</div>
                      {item.variantLabel && (
                        <div className={itemPriceStyle}>{item.variantLabel}</div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeItem(item.id, item.variantId)}
                    >
                      <Trash2 className={css({ height: "4", width: "4", color: "fg.muted" })} />
                    </Button>
                  </div>
                  <div className={itemPriceStyle}>
                    ₹{item.price.toLocaleString()}
                  </div>
                  <div className={qtyRowStyle}>
                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={() =>
                        updateQty(
                          item.id,
                          Math.max(1, item.qty - 1),
                          item.variantId
                        )
                      }
                    >
                      <Minus className={css({ height: "4", width: "4" })} />
                    </Button>
                    <Input
                      value={item.qty}
                      onChange={(e) => {
                        const n = parseInt(e.target.value || "1", 10);
                        if (!Number.isNaN(n))
                          updateQty(item.id, Math.max(1, n), item.variantId);
                      }}
                      className={qtyInputStyle}
                      type="number"
                      min={1}
                    />
                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={() =>
                        updateQty(item.id, item.qty + 1, item.variantId)
                      }
                    >
                      <Plus className={css({ height: "4", width: "4" })} />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className={footerStyle}>
            <div className={subtotalRowStyle}>
              <span>Subtotal</span>
              <span className={subtotalValueStyle}>
                ₹{totalPrice.toLocaleString()}
              </span>
            </div>
            <div className={footerButtonsStyle}>
              <Button
                variant="outline"
                className={css({ flex: "1" })}
                onClick={clear}
                disabled={items.length === 0}
              >
                Clear
              </Button>
              <Button
                asChild
                className={css({ flex: "1" })}
                disabled={items.length === 0}
                onClick={() => setOpen(false)}
              >
                <Link href="/checkout">Checkout</Link>
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
