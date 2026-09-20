/**
 * Inventory module ("Jabitha") — public surface.
 *
 * Other modules import from `@/modules/inventory` and nothing deeper.
 * Querying `prisma.inventoryLevel` from outside this folder is exactly the
 * coupling this architecture exists to prevent.
 */
export type {
  AdjustmentType,
  InventoryLocationDto,
  InventoryMovementType,
  InventoryPort,
  MovementContext,
  MovementRecord,
  StockLevel,
  StockLine,
} from "./contracts";
export { inventoryService } from "./inventory-service";

// Read models for the admin screens. Read-only by construction.
export {
  queryStock,
  queryStockSummary,
  LOW_STOCK_THRESHOLD,
  STOCK_PAGE_SIZE,
  type StockPage,
  type StockQuery,
  type StockRow,
  type StockStatus,
} from "./read/stock-read-model";
export {
  queryMovements,
  MOVEMENTS_PAGE_SIZE,
  type MovementPage,
  type MovementQuery,
  type MovementRow,
} from "./read/movement-read-model";
export {
  availabilityByProduct,
  availabilityByVariant,
  type ProductAvailability,
} from "./read/availability-read-model";
export { onHandByVariant, type OnHand } from "./read/on-hand-read-model";
