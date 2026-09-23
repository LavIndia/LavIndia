/**
 * Purchasing — the public shape of a supplier.
 *
 * Kept as its own module rather than folded into Inventory because buying is
 * not stock-keeping. Inventory answers "how many are on the shelf";
 * purchasing answers "who did we buy them from and what did we pay". The
 * accounting screens read this side, and a shop that never wants supplier
 * records can leave the module out entirely.
 */

export interface SupplierView {
  id: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  /** Indian tax registration, needed to claim input credit on a purchase. */
  gstin: string | null;
  address: string | null;
  /** Town, held apart from the street so vendors can be grouped by place. */
  city: string | null;
  state: string | null;
  pincode: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: Date;
}

export interface SupplierInput {
  name: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  gstin?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  notes?: string | null;
  isActive?: boolean;
}

/** What was bought from one supplier over a period, for the accounting view. */
export interface SupplierSpend {
  supplierId: string;
  supplierName: string;
  /** Units received. */
  quantity: number;
  /** Total paid, in paisa, across lines that stated a cost. */
  spendCents: number;
  /** Lines received with no cost recorded, so the total can be read honestly. */
  linesMissingCost: number;
  lastReceivedAt: Date | null;
}
