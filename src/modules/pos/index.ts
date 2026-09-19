/**
 * POS module — public surface.
 *
 * Orchestrates Catalog, Orders and Billing into a single counter sale. Owns
 * none of them.
 */
export { posService } from "./pos-service";
export type { PosSaleInput, PosSaleResult } from "./pos-service";
