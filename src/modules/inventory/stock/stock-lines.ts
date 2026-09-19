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
  const totals = new Map<string, number>();
  for (const line of lines) {
    totals.set(line.variantId, (totals.get(line.variantId) ?? 0) + line.quantity);
  }
  return [...totals].map(([variantId, quantity]) => ({
    variantId: VariantId(variantId),
    quantity,
  }));
}
