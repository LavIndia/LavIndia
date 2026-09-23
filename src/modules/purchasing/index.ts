/**
 * Purchasing module — public surface.
 *
 * Owns suppliers and the reading of what was spent with them. Does not own
 * stock: a delivery changes stock through the Inventory module, and this
 * side only records who it came from and what it cost.
 */
export { supplierService } from "./supplier-service";
export type { SupplierInput, SupplierSpend, SupplierView } from "./contracts";
