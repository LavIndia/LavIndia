/**
 * The shapes the account screens exchange with the user-facing API routes.
 *
 * Declared once here rather than repeated in each tab so that a change to
 * what `/api/user/address` returns is a change in one place, and so the
 * address card, the address form and the addresses tab cannot drift into
 * three slightly different ideas of what an address is.
 */

export interface Address {
  id: string;
  fullName: string;
  mobile: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: string;
  totalCents: number;
  createdAt: string;
  items: { id: string; quantity: number; price: number }[];
  address: Address;
}

export interface WishlistItem {
  id: string;
  product: {
    id: string;
    name: string;
    priceCents: number;
    images: Array<{ url: string; alt: string }>;
    category: { name: string };
  };
}

export interface LoginEvent {
  id: string;
  ipAddress: string | null;
  browser: string | null;
  os: string | null;
  deviceType: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  createdAt: string;
}
