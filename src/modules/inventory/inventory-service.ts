/**
 * The Inventory domain's service — the only implementation of `InventoryPort`.
 *
 * It sequences operations; it does not contain them. The atomic level change
 * lives in `stock/level-mutations`, the arithmetic per movement type in
 * `stock/mutation-rules`, line validation in `stock/stock-lines`, and
 * location resolution in `locations/location-repository`.
 *
 * Two invariants hold for every method:
 *
 *   1. A level and its ledger movement are written in the SAME transaction.
 *      Stock never moves silently and never moves without a traceable entry.
 *   2. Stock is never taken out of the pool without a guard that makes
 *      overselling impossible under concurrency.
 */
import { prisma, type Tx } from "../_shared/db";
import { DomainError, InsufficientStockError } from "../_shared/errors";
import { LocationId, VariantId } from "../_shared/ids";
import type { LocationId as LocationIdType, VariantId as VariantIdType } from "../_shared/ids";
import type {
  AdjustmentType,
  InventoryLocationDto,
  InventoryMovementType,
  InventoryPort,
  MovementContext,
  MovementRecord,
  StockLevel,
  StockLine,
} from "./contracts";
import { DefaultLocationResolver, listLocations } from "./locations/location-repository";
import { mutateLevel, peekAvailable } from "./stock/level-mutations";
import { MUTATION_RULES, failsOnMissingReservation, type MutationRule } from "./stock/mutation-rules";
import { assertValidLines, coalesceLines } from "./stock/stock-lines";
import {
  markReservationsConsumed,
  markReservationsReleased,
  recordReservations,
} from "./stock/reservations";
import { releaseExpiredReservations as sweepExpiredReservations } from "./stock/reservation-sweeper";

class InventoryService implements InventoryPort {
  private readonly defaultLocation = new DefaultLocationResolver();

  getDefaultLocationId(): Promise<LocationIdType> {
    return this.defaultLocation.resolve();
  }

  listLocations(options?: { activeOnly?: boolean }): Promise<InventoryLocationDto[]> {
    return listLocations(options);
  }

  async getLevels(
    variantIds: readonly VariantIdType[],
    options: { locationId?: LocationIdType } = {},
  ): Promise<Map<string, StockLevel>> {
    const result = new Map<string, StockLevel>();
    if (variantIds.length === 0) return result;

    const locationId = options.locationId ?? (await this.getDefaultLocationId());
    const rows = await prisma.inventoryLevel.findMany({
      where: { variantId: { in: [...variantIds] }, locationId },
      select: { variantId: true, locationId: true, quantity: true, reservedQuantity: true },
    });

    for (const row of rows) {
      result.set(row.variantId, {
        variantId: VariantId(row.variantId),
        locationId: LocationId(row.locationId),
        quantity: row.quantity,
        reservedQuantity: row.reservedQuantity,
        available: row.quantity - row.reservedQuantity,
      });
    }

    // A variant with no level row has simply never been stocked. Report that
    // as a real zero rather than a missing key, so callers don't each have to
    // decide what absence means.
    for (const variantId of variantIds) {
      if (!result.has(variantId)) {
        result.set(variantId, {
          variantId,
          locationId,
          quantity: 0,
          reservedQuantity: 0,
          available: 0,
        });
      }
    }

    return result;
  }

  receive(lines: readonly StockLine[], context: MovementContext, tx?: Tx) {
    return this.apply("RECEIVE", lines, this.withReference(context, "RECEIPT"), tx);
  }

  adjust(
    lines: readonly StockLine[],
    type: AdjustmentType,
    context: MovementContext & { reason: string },
    tx?: Tx,
  ) {
    if (!context.reason?.trim()) {
      throw new DomainError("VALIDATION_FAILED", "An adjustment needs a reason");
    }
    return this.apply(type, lines, this.withReference(context, "ADJUSTMENT"), tx);
  }

  reserve(
    lines: readonly StockLine[],
    context: MovementContext & { referenceId: string },
    tx?: Tx,
  ) {
    return this.apply("RESERVE", lines, this.withReference(context, "ORDER"), tx);
  }

  release(
    lines: readonly StockLine[],
    context: MovementContext & { referenceId: string },
    tx?: Tx,
  ) {
    return this.apply("RELEASE", lines, this.withReference(context, "ORDER"), tx);
  }

  /**
   * Sweeps holds whose window has passed. Delegates to the sweeper so the
   * same routine can be driven by a scheduled job without going through the
   * service instance.
   */
  async releaseExpiredReservations(limit = 100): Promise<number> {
    const { swept } = await sweepExpiredReservations(this, limit);
    return swept;
  }

  commitSale(
    lines: readonly StockLine[],
    context: MovementContext & { fromReservation?: boolean },
    tx?: Tx,
  ) {
    // Both paths are recorded as a SALE; only the level arithmetic differs,
    // because one of them is settling a hold placed earlier.
    return this.apply(
      context.fromReservation ? "SALE_FROM_RESERVATION" : "SALE",
      lines,
      this.withReference(context, "ORDER"),
      tx,
      "SALE",
    );
  }

  returnStock(lines: readonly StockLine[], context: MovementContext, tx?: Tx) {
    return this.apply("RETURN", lines, this.withReference(context, "ORDER"), tx);
  }

  private withReference(context: MovementContext, fallback: string): MovementContext {
    return { ...context, referenceType: context.referenceType ?? fallback };
  }

  /**
   * The shared path for every stock operation: validate, resolve the
   * location, then apply each line and write its ledger entry inside one
   * transaction. Given a transaction by the caller it joins theirs, so a POS
   * sale's stock, order and invoice commit or fail together.
   */
  private async apply(
    rule: MutationRule,
    rawLines: readonly StockLine[],
    context: MovementContext,
    tx: Tx | undefined,
    ledgerTypeOverride?: InventoryMovementType,
  ): Promise<MovementRecord[]> {
    assertValidLines(rawLines);
    const lines = coalesceLines(rawLines);
    const locationId = context.locationId ?? (await this.getDefaultLocationId());
    const ledgerType = (ledgerTypeOverride ?? rule) as InventoryMovementType;

    const run = (client: Tx) =>
      this.applyLines(client, rule, ledgerType, lines, locationId, context);

    return tx ? run(tx) : prisma.$transaction(run);
  }

  private async applyLines(
    client: Tx,
    rule: MutationRule,
    ledgerType: InventoryMovementType,
    lines: readonly StockLine[],
    locationId: LocationIdType,
    context: MovementContext,
  ): Promise<MovementRecord[]> {
    const records: MovementRecord[] = [];

    for (const line of lines) {
      // A key is scoped per line, so a multi-line basket retried after a
      // dropped response replays each line exactly once.
      const lineKey = context.idempotencyKey
        ? `${context.idempotencyKey}:${line.variantId}`
        : null;

      if (lineKey) {
        const alreadyApplied = await client.inventoryMovement.findUnique({
          where: { idempotencyKey: lineKey },
        });
        // Replay the original outcome rather than applying the movement a
        // second time. The caller cannot tell the retry from the first call,
        // which is the point.
        if (alreadyApplied) {
          records.push({
            ...alreadyApplied,
            variantId: VariantId(alreadyApplied.variantId),
            locationId: LocationId(alreadyApplied.locationId),
          });
          continue;
        }
      }

      const result = await mutateLevel(client, {
        variantId: line.variantId,
        locationId,
        ...MUTATION_RULES[rule](line.quantity),
      });

      // The guard was not met. Throwing aborts the transaction, rolling back
      // every line already applied, so no partial state can remain.
      if (!result) {
        throw await this.guardFailure(client, rule, line, locationId);
      }

      const movement = await client.inventoryMovement.create({
        data: {
          variantId: line.variantId,
          locationId,
          type: ledgerType,
          quantity: line.quantity,
          beforeQuantity: result.beforeQuantity,
          afterQuantity: result.afterQuantity,
          referenceType: context.referenceType ?? null,
          referenceId: context.referenceId ?? null,
          reason: context.reason ?? null,
          createdBy: context.actorId ?? null,
          idempotencyKey: lineKey,
        },
      });

      records.push({
        ...movement,
        variantId: VariantId(movement.variantId),
        locationId: LocationId(movement.locationId),
      });
    }

    // The named holds behind `reservedQuantity` are kept in step inside the
    // same transaction, so the aggregate and its detail can never disagree.
    await this.syncReservations(client, rule, lines, locationId, context);

    return records;
  }

  private async syncReservations(
    client: Tx,
    rule: MutationRule,
    lines: readonly StockLine[],
    locationId: LocationIdType,
    context: MovementContext,
  ): Promise<void> {
    const ref = context.referenceId
      ? { referenceType: context.referenceType ?? "ORDER", referenceId: context.referenceId }
      : null;
    if (!ref) return;

    const variantIds = lines.map((line) => VariantId(line.variantId));

    if (rule === "RESERVE") {
      await recordReservations(client, lines, locationId, ref, context.actorId);
    } else if (rule === "RELEASE") {
      await markReservationsReleased(client, variantIds, ref);
    } else if (rule === "SALE_FROM_RESERVATION") {
      await markReservationsConsumed(client, variantIds, ref);
    }
  }

  /**
   * Builds the specific failure for a guard that did not match. The current
   * numbers are read purely so the message can name a real figure — the
   * decision itself was already made, atomically, by the conditional update.
   */
  private async guardFailure(
    client: Tx,
    rule: MutationRule,
    line: StockLine,
    locationId: LocationIdType,
  ): Promise<DomainError> {
    const current = await peekAvailable(client, line.variantId, locationId);

    if (failsOnMissingReservation(rule)) {
      return new DomainError("RESERVATION_FAILED", "That stock is no longer held for this order", {
        variantId: line.variantId,
        requested: line.quantity,
        reserved: current.reservedQuantity,
      });
    }

    return new InsufficientStockError({
      variantId: line.variantId,
      requested: line.quantity,
      available: current.available,
    });
  }
}

/**
 * The single instance other modules import. Swapping this for an HTTP-backed
 * implementation when Inventory is split out is a one-line change here.
 */
export const inventoryService: InventoryPort = new InventoryService();
