import type { SupplierView } from "@/modules/purchasing";

/** Only the parts that were filled in, so a row never shows an empty label. */
export function describeSupplier(supplier: SupplierView): string | null {
  const place = [supplier.city, supplier.state].filter(Boolean).join(", ");
  const parts = [
    supplier.contactName,
    supplier.phone,
    place || null,
    supplier.gstin,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}
