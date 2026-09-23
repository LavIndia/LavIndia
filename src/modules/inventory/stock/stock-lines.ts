/**
 * Validation and normalisation of the stock lines handed to the Inventory
 * service. Kept separate from the service so both the service and any future
 * caller (a bulk import, a stocktake) can reuse the same rules.
 */
import { DomainError } from "../../_shared/errors";
import { VariantId } from "../../_shared/ids";
import type { StockLine } from "../contracts";

/** Quantities are always positive whole numbers; the operation decides direction. */
export function assertValidLines(lines: readonly StockLine[]): void {
  if (lines.length === 0) {
    throw new DomainError("VALIDATION_FAILED", "No stock lines were supplied");
  }
  for (const line of lines) {
    if (!Number.isInteger(line.quantity) || line.quantity <= 0) {
      throw new DomainError("INVALID_QUANTITY", "Quantity must be a whole number above zero", {
        variantId: line.variantId,
        quantity: line.quantity,
      });
    }
    // Refused, never ignored: silently dropping a serial would leave the
    // caller believing a specific piece was tracked when it was not.
    if (line.serialNumbers?.length) {
      throw new DomainError(
        "SERIAL_TRACKING_UNSUPPORTED",
        "Per-unit serial tracking is not enabled yet",
        { variantId: line.variantId },
      );
    }
  }
}

/**
 * Collapses duplicate lines for the same variant.
 *
 * Without this, a basket holding one variant on two lines would issue two
 * UPDATEs against a single row, and each could pass its guard separately
 * while together exceeding the stock actually on hand.
 */
// NOTE: once serial tracking lands, lines carrying distinct units must NOT be
// merged here — only quantity-tracked lines are interchangeable.
export function coalesceLines(lines: readonly StockLine[]): StockLine[] {
  /** Running weighted total for one of the money figures a line can carry. */
  type Money = { quantity: number; cents: number };
  const zero = (): Money => ({ quantity: 0, cents: 0 });

  const totals = new Map<
    string,
    { quantity: number; cost: Money; list: Money; agreed: Money }
  >();

  // Merging two deliveries of the same piece at different prices gives one
  // line, so each of its prices is what the combined units actually averaged.
  // Carrying only the first would misstate the total by the difference.
  const add = (into: Money, value: number | undefined, quantity: number) => {
    if (typeof value !== "number") return;
    into.quantity += quantity;
    into.cents += value * quantity;
  };

  for (const line of lines) {
    const entry =
      totals.get(line.variantId) ??
      { quantity: 0, cost: zero(), list: zero(), agreed: zero() };

    entry.quantity += line.quantity;
    add(entry.cost, line.unitCostCents, line.quantity);
    add(entry.list, line.listUnitCostCents, line.quantity);
    add(entry.agreed, line.agreedUnitCostCents, line.quantity);
    totals.set(line.variantId, entry);
  }

  // Left off entirely when no contributing line stated a price, so
  // "not recorded" stays distinct from "cost nothing".
  const average = (money: Money) =>
    money.quantity > 0 ? Math.round(money.cents / money.quantity) : undefined;

  return [...totals].map(([variantId, entry]) => {
    const cost = average(entry.cost);
    const list = average(entry.list);
    const agreed = average(entry.agreed);

    return {
      variantId: VariantId(variantId),
      quantity: entry.quantity,
      ...(cost === undefined ? {} : { unitCostCents: cost }),
      ...(list === undefined ? {} : { listUnitCostCents: list }),
      ...(agreed === undefined ? {} : { agreedUnitCostCents: agreed }),
    };
  });
}
