/**
 * Writing down what the engine worked out.
 *
 * An audit row is the full record of one calculation: what it was given, what
 * it classified each line as, the rate versions it relied on, the tax it
 * arrived at and the tax the existing engine arrived at for the same cart.
 * In SHADOW it is the engine's entire output; in ENFORCE it is the source the
 * invoice's GST particulars are built from.
 *
 * Recording a rate version as used is done by a database trigger in the same
 * statement, so a rate that has been relied on can no longer be edited.
 */
import type { Prisma } from "@prisma/client";
import type { Db } from "../_shared/db";
import { prisma } from "../_shared/db";
import type { GstAttachment } from "../orders/contracts";
import { ENGINE_VERSION, type GstPayload } from "./quote-types";

export interface AuditTarget {
  orderId?: string | null;
  orderNumber?: string | null;
  channel: string;
  attachment: GstAttachment;
}

function toRow(target: AuditTarget): Prisma.GstCalculationAuditUncheckedCreateInput {
  const payload = target.attachment.payload as GstPayload;
  const base = {
    orderId: target.orderId ?? null,
    orderNumber: target.orderNumber ?? null,
    mode: target.attachment.mode,
    channel: target.channel,
    engineVersion: ENGINE_VERSION,
    supplierStateCode: payload.supplierStateCode,
    placeOfSupplyCode: payload.placeOfSupplyCode,
    supplyType: payload.supplyType,
    inputs: {
      pricesIncludeTax: payload.pricesIncludeTax,
      deliveryState: payload.deliveryState,
      placeOfSupplyBasis: payload.placeOfSupplyBasis,
      charges: payload.charges,
      mixedBasketPolicy: payload.mixedBasketPolicy,
      lines: payload.classifications.map((c) => ({
        index: c.index,
        productId: c.productId,
        name: c.name,
        quantity: c.quantity,
        amountCents: c.amountCents,
      })),
    } as Prisma.InputJsonValue,
  };

  if (payload.status === "CALCULATED" && payload.result) {
    const { totals, lines } = payload.result;
    return {
      ...base,
      outcome: totals.taxCents === payload.legacyTaxCents ? "MATCHED" : "DIFFERS",
      lines: lines.map((l) => ({
        lineId: l.lineId,
        kind: l.kind,
        code: l.rate.code,
        codeKind: l.rate.codeKind,
        rateVersionId: l.rate.id,
        rateBps: l.rate.rateBps,
        cessBps: l.rate.cessBps,
        inputCents: l.inputCents,
        taxableCents: l.taxableCents,
        cgstCents: l.cgstCents,
        sgstCents: l.sgstCents,
        igstCents: l.igstCents,
        cessCents: l.cessCents,
        taxCents: l.taxCents,
        payableCents: l.payableCents,
        mappingId: payload.classifications[Number(l.lineId.split(":")[0])]?.mappingId ?? null,
      })) as Prisma.InputJsonValue,
      rateVersionIds: [...new Set(lines.map((l) => l.rate.id))],
      taxableCents: totals.taxableCents,
      cgstCents: totals.cgstCents,
      sgstCents: totals.sgstCents,
      igstCents: totals.igstCents,
      cessCents: totals.cessCents,
      totalTaxCents: totals.taxCents,
      legacyTaxCents: payload.legacyTaxCents,
      differenceCents: totals.taxCents - payload.legacyTaxCents,
    };
  }

  const missing = payload.status === "MISSING_MAPPING";
  return {
    ...base,
    outcome: missing ? "MISSING_MAPPING" : "ERROR",
    lines: [],
    missingMappings: missing ? (payload.missing as unknown as Prisma.InputJsonValue) : undefined,
    errorMessage: missing ? undefined : (payload.message ?? "The calculation failed"),
    rateVersionIds: [],
    taxableCents: 0,
    cgstCents: 0,
    sgstCents: 0,
    igstCents: 0,
    totalTaxCents: 0,
  };
}

/** Writes the audit row inside the caller's transaction. Throws on failure. */
export async function recordGstAudit(client: Db, target: AuditTarget): Promise<string> {
  const row = await client.gstCalculationAudit.create({ data: toRow(target), select: { id: true } });
  return row.id;
}

/**
 * Writes the audit row after the sale, on its own. A failure here is logged and
 * swallowed: in SHADOW the audit must never be the reason a sale did not happen.
 */
export async function recordGstAuditSafely(target: AuditTarget): Promise<void> {
  try {
    await recordGstAudit(prisma, target);
  } catch (error) {
    console.error("Could not record the GST shadow audit:", error);
  }
}
