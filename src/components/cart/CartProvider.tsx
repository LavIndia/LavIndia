"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type CartItem = {
  id: string;
  name: string;
  price: number; // in currency unit (₹)
  image?: string | null;
  variantId?: string | null;
  /** Human-readable variant description (e.g. "Multi Color - Gold") shown in cart/checkout UI instead of the raw variant id. */
  variantLabel?: string | null;
  qty: number;
};

type CartState = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "qty"> & { qty?: number }) => void;
  removeItem: (id: string, variantId?: string | null) => void;
  updateQty: (id: string, qty: number, variantId?: string | null) => void;
  clear: () => void;
  totalCount: number;
  totalPrice: number;
};

const CartContext = createContext<CartState | null>(null);

const STORAGE_KEY = "lavishindia_cart_v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const raw =
        typeof window !== "undefined"
          ? window.localStorage.getItem(STORAGE_KEY)
          : null;
      if (raw) {
        const parsed = JSON.parse(raw) as CartItem[];
        if (Array.isArray(parsed)) setItems(parsed);
      }
    } catch {
      // ignore parse errors
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // Persist to localStorage
  useEffect(() => {
    if (!isHydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore
    }
  }, [items, isHydrated]);

  const addItem: CartState["addItem"] = (item) => {
    setItems((prev) => {
      const keyMatch = (x: CartItem) =>
        x.id === item.id && (x.variantId ?? null) === (item.variantId ?? null);
      const existing = prev.findIndex(keyMatch);
      if (existing >= 0) {
        const copy = [...prev];
        copy[existing] = {
          ...copy[existing],
          qty: copy[existing].qty + (item.qty ?? 1),
        };
        return copy;
      }
      return [...prev, { ...item, qty: item.qty ?? 1 }];
    });
  };

  const removeItem: CartState["removeItem"] = (id, variantId = null) => {
    setItems((prev) =>
      prev.filter(
        (x) => !(x.id === id && (x.variantId ?? null) === (variantId ?? null))
      )
    );
  };

  const updateQty: CartState["updateQty"] = (id, qty, variantId = null) => {
    setItems((prev) =>
      prev
        .map((x) =>
          x.id === id && (x.variantId ?? null) === (variantId ?? null)
            ? { ...x, qty }
            : x
        )
        .filter((x) => x.qty > 0)
    );
  };

  const clear = () => setItems([]);

  const { totalCount, totalPrice } = useMemo(() => {
    const count = items.reduce((sum, x) => sum + x.qty, 0);
    const price = items.reduce((sum, x) => sum + x.qty * x.price, 0);
    return { totalCount: count, totalPrice: price };
  }, [items]);

  const value: CartState = {
    items,
    addItem,
    removeItem,
    updateQty,
    clear,
    totalCount,
    totalPrice,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCartContext() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCartContext must be used within CartProvider");
  return ctx;
}
