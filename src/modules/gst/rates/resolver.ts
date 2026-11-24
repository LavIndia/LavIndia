/**
 * From a product to the approved rate version that applies on a given day.
 *
 * Two facts must both be true for a piece to be taxed by the engine: its
 * classification is VERIFIED, and the code it points at has an APPROVED rate
 * in force that day (and, where a rate depends on price, for that unit
 * value). Anything less is reported, with the reason, and the engine is never
 * handed a rate it has not been told is approved — there is no default.
 *
 * Dates are India calendar days: a rate effective "from 22 September" starts
 * at midnight IST, whichever time zone the server is in.
 */
import type { GstChargeKind, GstClassificationStatus } from "@prisma/client";
import { prisma } from "../../_shared/db";
import type { RateVersion } from "../engine/types";

export type MissingReason = "NO_MAPPING" | "NOT_VERIFIED" | "NO_APPROVED_RATE";

export interface Classified {
  rate: RateVersion;
  mappingId: string;
}

export interface Unclassified {
  key: string;
  productId: string | null;
  chargeKind: GstChargeKind;
  reason: MissingReason;
  detail: string;
}

export interface GoodsQuery {
  /** Whatever the caller wants the answer filed under, usually the line id. */
  key: string;
  productId: string;
  variantId?: string | null;
  unitValueCents: number;
}

export interface Resolution {
  classified: Map<string, Classified>;
  missing: Unclassified[];
}

/** The India calendar day of an instant, as a UTC-midnight Date for DATE comparisons. */
export function indiaDay(on: Date): Date {
  const shifted = new Date(on.getTime() + 5.5 * 3_600_000);
  return new Date(`${shifted.toISOString().slice(0, 10)}T00:00:00.000Z`);
}

const inForce = (day: Date) => ({
  effectiveFrom: { lte: day },
  OR: [{ effectiveTo: null }, { effectiveTo: { gte: day } }],
});

type RateRow = Awaited<ReturnType<typeof loadRates>>[number];

function loadRates(day: Date, hsnIds: string[], sacIds: string[]) {
  if (hsnIds.length === 0 && sacIds.length === 0) return Promise.resolve([] as never[]);
  return prisma.gstRateMaster.findMany({
    where: {
      approval: "APPROVED",
      ...inForce(day),
      AND: [{ OR: [{ hsnId: { in: hsnIds } }, { sacId: { in: sacIds } }] }],
    },
    include: { hsn: { select: { code: true } }, sac: { select: { code: true } } },
    orderBy: { effectiveFrom: "desc" },
  });
}

function pickRate(rows: RateRow[], codeId: string, unitValueCents: number): RateRow | undefined {
  return rows.find(
    (row) =>
      (row.hsnId === codeId || row.sacId === codeId) &&
      (row.minUnitValueCents === null || unitValueCents >= row.minUnitValueCents) &&
      (row.maxUnitValueCents === null || unitValueCents <= row.maxUnitValueCents),
  );
}

function toVersion(row: RateRow): RateVersion {
  return {
    id: row.id,
    code: row.hsn?.code ?? row.sac?.code ?? "",
    codeKind: row.hsnId ? "HSN" : "SAC",
    rateBps: row.rateBps,
    cgstBps: row.cgstBps,
    sgstBps: row.sgstBps,
    igstBps: row.igstBps,
    cessBps: row.cessBps,
  };
}

interface MappingRow {
  id: string;
  productId: string | null;
  variantId: string | null;
  chargeKind: GstChargeKind;
  hsnId: string | null;
  sacId: string | null;
  effectiveFrom: Date;
}

const newest = (a: MappingRow, b: MappingRow) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime();

/** Resolves goods lines. Lines that cannot be resolved come back in `missing`, never defaulted. */
export async function resolveGoods(queries: readonly GoodsQuery[], on: Date): Promise<Resolution> {
  const day = indiaDay(on);
  const classified = new Map<string, Classified>();
  const missing: Unclassified[] = [];
  if (queries.length === 0) return { classified, missing };

  const productIds = [...new Set(queries.map((q) => q.productId))];
  const mappings = await prisma.gstProductMapping.findMany({
    where: { chargeKind: "PRODUCT", productId: { in: productIds }, status: "VERIFIED", ...inForce(day) },
    select: { id: true, productId: true, variantId: true, chargeKind: true, hsnId: true, sacId: true, effectiveFrom: true },
  });
  const chosen = new Map<string, MappingRow>();
  for (const query of queries) {
    const own = mappings.filter((m) => m.productId === query.productId);
    const pick =
      own.filter((m) => query.variantId && m.variantId === query.variantId).sort(newest)[0] ??
      own.filter((m) => m.variantId === null).sort(newest)[0];
    if (pick) chosen.set(query.key, pick);
  }

  const hsnIds = [...new Set([...chosen.values()].flatMap((m) => (m.hsnId ? [m.hsnId] : [])))];
  const sacIds = [...new Set([...chosen.values()].flatMap((m) => (m.sacId ? [m.sacId] : [])))];
  const rates = await loadRates(day, hsnIds, sacIds);

  const unmapped: GoodsQuery[] = [];
  for (const query of queries) {
    const mapping = chosen.get(query.key);
    if (!mapping) {
      unmapped.push(query);
      continue;
    }
    const rate = pickRate(rates, (mapping.hsnId ?? mapping.sacId)!, query.unitValueCents);
    if (!rate) {
      missing.push({
        key: query.key,
        productId: query.productId,
        chargeKind: "PRODUCT",
        reason: "NO_APPROVED_RATE",
        detail: "Its classification is verified, but no approved rate is in force for that code on this date",
      });
      continue;
    }
    classified.set(query.key, { rate: toVersion(rate), mappingId: mapping.id });
  }

  if (unmapped.length > 0) {
    const unverified = await prisma.gstProductMapping.findMany({
      where: { chargeKind: "PRODUCT", productId: { in: [...new Set(unmapped.map((q) => q.productId))] } },
      select: { productId: true, status: true },
    });
    const statusOf = new Map<string, GstClassificationStatus>(
      unverified.flatMap((m) => (m.productId ? [[m.productId, m.status] as const] : [])),
    );
    for (const query of unmapped) {
      const status = statusOf.get(query.productId);
      missing.push({
        key: query.key,
        productId: query.productId,
        chargeKind: "PRODUCT",
        reason: status ? "NOT_VERIFIED" : "NO_MAPPING",
        detail: status
          ? `Its classification is ${status.replace(/_/g, " ").toLowerCase()}, not verified`
          : "It has no GST classification",
      });
    }
  }
  return { classified, missing };
}

/** Resolves the classification of a delivery or cash-on-delivery charge. */
export async function resolveCharge(
  kind: "SHIPPING" | "COD_FEE",
  amountCents: number,
  on: Date,
): Promise<{ classified?: Classified; missing?: Unclassified }> {
  const day = indiaDay(on);
  const mapping = (
    await prisma.gstProductMapping.findMany({
      where: { chargeKind: kind, status: "VERIFIED", ...inForce(day) },
      select: { id: true, productId: true, variantId: true, chargeKind: true, hsnId: true, sacId: true, effectiveFrom: true },
    })
  ).sort(newest)[0];
  const fail = (reason: MissingReason, detail: string) => ({
    missing: { key: kind, productId: null, chargeKind: kind, reason, detail } as Unclassified,
  });
  if (!mapping) return fail("NO_MAPPING", `The ${kind === "SHIPPING" ? "delivery" : "cash-on-delivery"} charge has no verified classification`);
  const rate = pickRate(await loadRates(day, mapping.hsnId ? [mapping.hsnId] : [], mapping.sacId ? [mapping.sacId] : []), (mapping.hsnId ?? mapping.sacId)!, amountCents);
  if (!rate) return fail("NO_APPROVED_RATE", "Its classification is verified, but no approved rate is in force on this date");
  return { classified: { rate: toVersion(rate), mappingId: mapping.id } };
}
