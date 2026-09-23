/**
 * The Inventory domain's public contract — product name "Jabitha".
 *
 * This is the ENTIRE surface other modules may depend on. Inventory is
 * deliberately ignorant of the catalog: it stores no product name, price or
 * image, and every method here speaks in `VariantId` and `LocationId`. That
 * is what lets this domain be lifted out as its own service (or its own
 * product) without dragging LavIndia's catalog behind it.
 *
 * ONE source of truth: the storefront and the POS both consume these levels.
 * There is no such thing as separate "website stock" and "counter stock".
 */
import type { LocationId, VariantId } from "../_shared/ids";
import type { Tx } from "../_shared/db";

export type InventoryMovementType =
  | "RECEIVE"
  | "SALE"
  | "RETURN"
  | "ADJUSTMENT_IN"
  | "ADJUSTMENT_OUT"
  | "DAMAGE"
  | "RESERVE"
  | "RELEASE";

/** The adjustment kinds an operator may pick in Admin > Inventory > Adjustments. */
export type AdjustmentType = "ADJUSTMENT_IN" | "ADJUSTMENT_OUT" | "DAMAGE";

export interface InventoryLocationDto {
  locationId: LocationId;
  name: string;
  code: string;
  isActive: boolean;
  isDefault: boolean;
}

export interface StockLevel {
  variantId: VariantId;
  locationId: LocationId;
  quantity: number;
  /** Held against in-flight online payments; not sellable to anyone else. */
  reservedQuantity: number;
  /** quantity - reservedQuantity. What may actually be sold right now. */
  available: number;
}

/** One line of a stock operation. Quantity is always positive; the operation decides direction. */
export interface StockLine {
  variantId: VariantId;
  quantity: number;
  /**
   * The specific physical units this line refers to.
   *
   * NOT IMPLEMENTED YET — supplying it is rejected rather than ignored, so a
   * caller can never believe it tracked a serial that was silently dropped.
   * It is declared now so that POS, checkout and receiving already speak a
   * shape that can carry per-unit identity, making serialisation an additive
   * change. See src/modules/inventory/SERIALISATION.md.
   */
  serialNumbers?: readonly string[];
  /**
   * What one unit of this line cost, in paisa.
   *
   * Carried per line rather than per delivery because one delivery routinely
   * contains pieces bought at different prices, and a single figure spread
   * over the whole note would misstate the margin on every one of them.
   * Meaningful on a receipt; ignored elsewhere.
   */
  unitCostCents?: number;
  /**
   * What the vendor first asked per unit, in paisa.
   *
   * Recorded so the shop can see what bargaining is worth. Optional: plenty
   * of deliveries arrive at a price nobody argued about.
   */
  listUnitCostCents?: number;
  /** The price per unit agreed after bargaining, in paisa. */
  agreedUnitCostCents?: number;
}

/**
 * Who did this and why, recorded on every ledger entry. `reason` is required
 * by the service for adjustments specifically: stock never changes without a
 * stated cause.
 */
export interface MovementContext {
  locationId?: LocationId;
  referenceType?: string;
  referenceId?: string;
  reason?: string;
  actorId?: string;
  /** Who the stock was bought from. Meaningful on a receipt only. */
  supplierId?: string;
  /** The vendor's own bill number, as printed on it. */
  invoiceNumber?: string;
  /** The date on the invoice, which is often not the day it was booked in. */
  invoiceDate?: Date;
  /** The delivery these lines belong to. Set by `receive`, not by callers. */
  receiptId?: string;
  /**
   * Makes the operation safe to retry. A dropped response on a flaky counter
   * connection is routine; retrying with the same key replays the original
   * result instead of applying the movement a second time.
   */
  idempotencyKey?: string;
}

export interface MovementRecord {
  id: string;
  variantId: VariantId;
  locationId: LocationId;
  type: InventoryMovementType;
  quantity: number;
  beforeQuantity: number;
  afterQuantity: number;
  referenceType: string | null;
  referenceId: string | null;
  reason: string | null;
  createdBy: string | null;
  createdAt: Date;
}

/**
 * Mutating methods accept an optional transaction so a caller can compose
 * several domains into one atomic unit — a POS sale consumes stock, writes
 * the order and issues the invoice together, or none of it happens. Passed
 * no transaction, each method opens its own.
 */
export interface InventoryPort {
  getDefaultLocationId(): Promise<LocationId>;
  listLocations(options?: { activeOnly?: boolean }): Promise<InventoryLocationDto[]>;

  /**
   * Levels for many variants in one query, keyed by variant id. Batch by
   * design: a cart, a POS basket and a stock table all need several at once,
   * and asking one at a time would be an N+1 waterfall.
   */
  getLevels(
    variantIds: readonly VariantId[],
    options?: { locationId?: LocationId },
  ): Promise<Map<string, StockLevel>>;

  /** Goods arriving into a location. */
  receive(lines: readonly StockLine[], context: MovementContext, tx?: Tx): Promise<MovementRecord[]>;

  /** A counted correction or a write-off. `context.reason` is mandatory. */
  adjust(
    lines: readonly StockLine[],
    type: AdjustmentType,
    context: MovementContext & { reason: string },
    tx?: Tx,
  ): Promise<MovementRecord[]>;

  /**
   * Holds stock for an online payment in flight. Fails rather than
   * overselling. `referenceId` is required: a hold has to be releasable by
   * whose it is, and it expires so an abandoned checkout cannot strand stock.
   */
  reserve(
    lines: readonly StockLine[],
    context: MovementContext & { referenceId: string },
    tx?: Tx,
  ): Promise<MovementRecord[]>;

  /** Returns held stock to the pool after a failed or abandoned payment. */
  release(
    lines: readonly StockLine[],
    context: MovementContext & { referenceId: string },
    tx?: Tx,
  ): Promise<MovementRecord[]>;

  /**
   * Consumes stock for a completed sale. `fromReservation` converts a hold
   * made earlier by `reserve`; without it the stock is taken directly, which
   * is what a POS sale at the counter does.
   */
  commitSale(
    lines: readonly StockLine[],
    context: MovementContext & { fromReservation?: boolean },
    tx?: Tx,
  ): Promise<MovementRecord[]>;

  /** Stock coming back from a customer. */
  returnStock(lines: readonly StockLine[], context: MovementContext, tx?: Tx): Promise<MovementRecord[]>;

  /**
   * Releases holds that have outlived their window, returning how many were
   * swept. Run on a schedule: without it, an abandoned checkout would strand
   * its stock permanently. Each release goes through the ordinary path, so a
   * swept hold leaves the same ledger trail as a manual one.
   */
  releaseExpiredReservations(limit?: number): Promise<number>;
}
