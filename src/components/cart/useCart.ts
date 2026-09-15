"use client";

import { useCartContext } from "./CartProvider";

export const useCart = useCartContext;

export type { CartItem } from "./CartProvider";
