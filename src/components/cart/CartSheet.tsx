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

export default function CartSheet() {
  const [open, setOpen] = useState(false);
  const { items, totalCount, totalPrice, updateQty, removeItem, clear } =
    useCart();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 relative">
          <ShoppingCart className="h-4 w-4" />
          {totalCount > 0 && (
            <span className="absolute -top-1 -right-1 inline-flex items-center justify-center rounded-full bg-amber-600 text-white text-[10px] font-semibold h-4 min-w-4 px-1">
              {totalCount}
            </span>
          )}
          <span className="sr-only">Cart</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[400px] sm:w-[480px]">
        <SheetHeader>
          <SheetTitle>Your Cart</SheetTitle>
        </SheetHeader>
        <div className="mt-6 flex flex-col h-[calc(100%-5rem)]">
          {/* Items */}
          <div className="flex-1 overflow-auto space-y-4 pr-2">
            {items.length === 0 && (
              <div className="text-sm text-gray-500">Your cart is empty.</div>
            )}
            {items.map((item) => (
              <div
                key={`${item.id}:${item.variantId ?? "_"}`}
                className="flex gap-3 border-b pb-3"
              >
                {item.image ? (
                  <Image
                    src={item.image}
                    alt={item.name}
                    width={64}
                    height={64}
                    className="rounded object-cover w-16 h-16"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-100 rounded" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="truncate font-medium text-gray-900">
                      {item.name}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => removeItem(item.id, item.variantId)}
                    >
                      <Trash2 className="h-4 w-4 text-gray-500" />
                    </Button>
                  </div>
                  <div className="text-sm text-gray-600">
                    ₹{item.price.toLocaleString()}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() =>
                        updateQty(
                          item.id,
                          Math.max(1, item.qty - 1),
                          item.variantId
                        )
                      }
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      value={item.qty}
                      onChange={(e) => {
                        const n = parseInt(e.target.value || "1", 10);
                        if (!Number.isNaN(n))
                          updateQty(item.id, Math.max(1, n), item.variantId);
                      }}
                      className="h-8 w-14 text-center"
                      type="number"
                      min={1}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() =>
                        updateQty(item.id, item.qty + 1, item.variantId)
                      }
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="pt-4 border-t space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span>Subtotal</span>
              <span className="font-semibold">
                ₹{totalPrice.toLocaleString()}
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={clear}
                disabled={items.length === 0}
              >
                Clear
              </Button>
              <Button
                asChild
                className="flex-1"
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
