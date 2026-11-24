/**
 * Classifying a product, and answering for it.
 *
 *   details saved  →  submitted for approval  →  approved | rejected
 *
 * A classification only reaches VERIFIED when the accountant's name is
 * recorded against it, and only for a piece whose composition is complete.
 * Every step lands in an append-only trail, so who decided what, when, and
 * on what information, can always be answered.
 *
 * Changing the details of a piece after it was submitted or approved sends
 * the classification back for review rather than leaving an approval that no
 * longer describes the piece.
 */
import type { GstChargeKind, GstClassificationAction, Prisma } from "@prisma/client";
import { prisma } from "../_shared/db";
import { DomainError } from "../_shared/errors";
import { computeInfoStatus, missingInformation, suggestHeadings, type Composition, type Gem, type PlatingType } from "./composition";

export interface Actor {
  id: string;
  name: string | null;
}

export interface CompositionInput {
  baseMetal?: string | null;
  alloyNotes?: string | null;
  platingType?: PlatingType;
  platingMetal?: string | null;
  preciousMetal?: string | null;
  preciousPurity?: string | null;
  preciousWeightMg?: number | null;
  gems?: Gem[] | null;
  isHandmade?: boolean | null;
  handmadeNotes?: string | null;
  supplierName?: string | null;
  supplierHsn?: string | null;
  materialNotes?: string | null;
  /** Who is confirming these details are right. Omit to leave unconfirmed. */
  confirmedBy?: string | null;
}

const text = (v: string | null | undefined) => (v === undefined ? undefined : v?.trim() ? v.trim() : null);

async function writeEvent(
  client: Prisma.TransactionClient | typeof prisma,
  action: GstClassificationAction,
  actor: Actor,
  fields: { productId?: string | null; mappingId?: string | null; approverName?: string | null; reason?: string | null; details?: Prisma.InputJsonValue },
) {
  await client.gstClassificationEvent.create({
    data: { action, actorId: actor.id, actorName: actor.name, productId: fields.productId ?? null, mappingId: fields.mappingId ?? null, approverName: fields.approverName ?? null, reason: fields.reason ?? null, details: fields.details },
  });
}

const asComposition = (row: { baseMetal: string | null; platingType: PlatingType; platingMetal: string | null; preciousMetal: string | null; preciousPurity: string | null; gems: unknown; confirmedBy: string | null }): Composition => ({
  baseMetal: row.baseMetal,
  platingType: row.platingType,
  platingMetal: row.platingMetal,
  preciousMetal: row.preciousMetal,
  preciousPurity: row.preciousPurity,
  gems: Array.isArray(row.gems) ? (row.gems as Gem[]) : null,
  confirmedBy: row.confirmedBy,
});

export async function saveComposition(productId: string, input: CompositionInput, actor: Actor) {
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true, name: true } });
  if (!product) throw new DomainError("PRODUCT_NOT_FOUND", "That product does not exist");

  const before = await prisma.gstProductProfile.findUnique({ where: { productId } });
  const merged = {
    baseMetal: text(input.baseMetal) ?? (input.baseMetal === undefined ? before?.baseMetal ?? null : null),
    platingType: (input.platingType ?? before?.platingType ?? "UNKNOWN") as PlatingType,
    platingMetal: input.platingMetal === undefined ? before?.platingMetal ?? null : text(input.platingMetal) ?? null,
    preciousMetal: input.preciousMetal === undefined ? before?.preciousMetal ?? null : text(input.preciousMetal) ?? null,
    preciousPurity: input.preciousPurity === undefined ? before?.preciousPurity ?? null : text(input.preciousPurity) ?? null,
    gems: input.gems === undefined ? (Array.isArray(before?.gems) ? (before!.gems as unknown as Gem[]) : null) : input.gems,
  };
  const detailsChanged = !before || JSON.stringify([merged.baseMetal, merged.platingType, merged.platingMetal, merged.preciousMetal, merged.preciousPurity, merged.gems]) !== JSON.stringify([before.baseMetal, before.platingType, before.platingMetal, before.preciousMetal, before.preciousPurity, before.gems]);

  // Confirmation belongs to the details it was given for: changing them clears it.
  const confirmedBy = input.confirmedBy?.trim() ? input.confirmedBy.trim() : detailsChanged ? null : before?.confirmedBy ?? null;
  const composition: Composition = { ...merged, confirmedBy };
  const infoStatus = computeInfoStatus(composition);

  const data = {
    ...merged,
    gems: merged.gems === null ? undefined : (merged.gems as unknown as Prisma.InputJsonValue),
    alloyNotes: text(input.alloyNotes),
    preciousWeightMg: input.preciousWeightMg === undefined ? undefined : input.preciousWeightMg,
    isHandmade: input.isHandmade === undefined ? undefined : input.isHandmade,
    handmadeNotes: text(input.handmadeNotes),
    supplierName: text(input.supplierName),
    supplierHsn: text(input.supplierHsn),
    materialNotes: text(input.materialNotes),
    infoStatus,
    confirmedBy,
    confirmedAt: confirmedBy ? (confirmedBy === before?.confirmedBy && !detailsChanged ? before?.confirmedAt ?? new Date() : new Date()) : null,
    updatedBy: actor.id,
  };

  return prisma.$transaction(async (tx) => {
    const row = await tx.gstProductProfile.upsert({ where: { productId }, create: { productId, ...data }, update: data });
    await writeEvent(tx, "INFO_SAVED", actor, { productId, details: { infoStatus, missing: missingInformation(composition), confirmedBy } });

    // Details changed under an existing submission or approval: back to review.
    if (before && detailsChanged) {
      const live = await tx.gstProductMapping.findMany({ where: { productId, chargeKind: "PRODUCT", status: { in: ["VERIFIED", "NEEDS_ACCOUNTANT_APPROVAL"] } } });
      for (const mapping of live) {
        await tx.gstProductMapping.update({ where: { id: mapping.id }, data: { status: "NEEDS_PRODUCT_INFORMATION", approvedBy: null, approvedAt: null } });
        await writeEvent(tx, "WITHDRAWN", actor, { productId, mappingId: mapping.id, reason: "The product's material details were changed, so its classification must be reviewed again" });
      }
    }
    return row;
  });
}

export interface ClassifyTarget {
  kind: GstChargeKind;
  productId?: string | null;
}

export interface SubmitInput {
  hsnId?: string | null;
  sacId?: string | null;
  effectiveFrom: Date;
  basis?: string | null;
}

/** Puts a proposed classification in front of the accountant. */
export async function submitClassification(target: ClassifyTarget, input: SubmitInput, actor: Actor) {
  if (!!input.hsnId === !!input.sacId) throw new DomainError("VALIDATION_FAILED", "Choose either an HSN or a SAC, not both");
  if (target.kind === "PRODUCT") {
    if (!target.productId) throw new DomainError("VALIDATION_FAILED", "A product is required");
    if (input.sacId) throw new DomainError("VALIDATION_FAILED", "A piece is goods, so it takes an HSN");
    const profile = await prisma.gstProductProfile.findUnique({ where: { productId: target.productId } });
    const missing = profile ? missingInformation(asComposition(profile)) : ["Material details have not been entered"];
    if (missing.length > 0) throw new DomainError("VALIDATION_FAILED", `Cannot be submitted yet: ${missing[0]}${missing.length > 1 ? ` (and ${missing.length - 1} more)` : ""}`, { missing });
  } else if (target.productId) {
    throw new DomainError("VALIDATION_FAILED", "A delivery or cash-on-delivery charge has no product");
  }
  const code = input.hsnId ? await prisma.gstHsnMaster.findUnique({ where: { id: input.hsnId } }) : await prisma.gstSacMaster.findUnique({ where: { id: input.sacId! } });
  if (!code) throw new DomainError("VALIDATION_FAILED", "That code is not in the master");

  return prisma.$transaction(async (tx) => {
    const open = await tx.gstProductMapping.findFirst({
      where: { chargeKind: target.kind, productId: target.productId ?? null, variantId: null, status: { in: ["NEEDS_PRODUCT_INFORMATION", "NEEDS_ACCOUNTANT_APPROVAL"] } },
      orderBy: { createdAt: "desc" },
    });
    const data = { hsnId: input.hsnId ?? null, sacId: input.sacId ?? null, effectiveFrom: input.effectiveFrom, basis: input.basis?.trim() || null, status: "NEEDS_ACCOUNTANT_APPROVAL" as const, approvedBy: null, approvedAt: null };
    const mapping = open
      ? await tx.gstProductMapping.update({ where: { id: open.id }, data })
      : await tx.gstProductMapping.create({ data: { ...data, chargeKind: target.kind, productId: target.productId ?? null } });
    await writeEvent(tx, "SUBMITTED", actor, { productId: target.productId ?? null, mappingId: mapping.id, details: { code: code.code, effectiveFrom: input.effectiveFrom.toISOString().slice(0, 10), basis: data.basis } });
    return mapping;
  });
}

/** The accountant's approval. Their name is required and recorded beside the admin who entered it. */
export async function approveClassification(mappingId: string, approverName: string, actor: Actor) {
  if (!approverName.trim()) throw new DomainError("VALIDATION_FAILED", "The accountant's name is required to approve");
  const mapping = await prisma.gstProductMapping.findUnique({ where: { id: mappingId } });
  if (!mapping) throw new DomainError("NOT_FOUND", "That classification does not exist");
  if (mapping.status !== "NEEDS_ACCOUNTANT_APPROVAL") throw new DomainError("CONFLICT", "Only a submitted classification can be approved");
  if (mapping.chargeKind === "PRODUCT" && mapping.productId) {
    const profile = await prisma.gstProductProfile.findUnique({ where: { productId: mapping.productId } });
    if (!profile || missingInformation(asComposition(profile)).length > 0) throw new DomainError("VALIDATION_FAILED", "The product's material details are no longer complete");
  }

  return prisma.$transaction(async (tx) => {
    // The version this replaces ends the day before this one starts.
    const day = new Date(mapping.effectiveFrom.getTime() - 86_400_000);
    await tx.gstProductMapping.updateMany({
      where: { chargeKind: mapping.chargeKind, productId: mapping.productId, variantId: mapping.variantId, status: "VERIFIED", effectiveTo: null, id: { not: mapping.id } },
      data: { effectiveTo: day },
    });
    const row = await tx.gstProductMapping.update({
      where: { id: mappingId },
      data: { status: "VERIFIED", approvedBy: `${approverName.trim()} (entered by ${actor.name ?? actor.id})`, approvedAt: new Date() },
    });
    await writeEvent(tx, "APPROVED", actor, { productId: mapping.productId, mappingId, approverName: approverName.trim() });
    return row;
  });
}

export async function rejectClassification(mappingId: string, approverName: string, reason: string, actor: Actor) {
  if (!approverName.trim() || !reason.trim()) throw new DomainError("VALIDATION_FAILED", "The accountant's name and a reason are required to reject");
  const mapping = await prisma.gstProductMapping.findUnique({ where: { id: mappingId } });
  if (!mapping || mapping.status !== "NEEDS_ACCOUNTANT_APPROVAL") throw new DomainError("CONFLICT", "Only a submitted classification can be rejected");
  return prisma.$transaction(async (tx) => {
    const row = await tx.gstProductMapping.update({ where: { id: mappingId }, data: { status: "NEEDS_PRODUCT_INFORMATION", basis: `Rejected: ${reason.trim()}` } });
    await writeEvent(tx, "REJECTED", actor, { productId: mapping.productId, mappingId, approverName: approverName.trim(), reason: reason.trim() });
    return row;
  });
}

export interface WorklistRow {
  productId: string;
  name: string;
  category: string;
  priceCents: number;
  infoStatus: "MISSING" | "PARTIAL" | "COMPLETE";
  missing: string[];
  suggested: string[];
  mapping: { id: string; status: string; code: string | null; effectiveFrom: string; approvedBy: string | null } | null;
}

/** Every product with where it stands: what is missing, what is suggested, what is decided. */
export async function worklist(): Promise<WorklistRow[]> {
  const [products, profiles, mappings, hsn] = await Promise.all([
    prisma.product.findMany({ select: { id: true, name: true, priceCents: true, category: { select: { name: true } } }, orderBy: [{ categoryId: "asc" }, { name: "asc" }] }),
    prisma.gstProductProfile.findMany(),
    prisma.gstProductMapping.findMany({ where: { chargeKind: "PRODUCT", variantId: null }, orderBy: { createdAt: "desc" } }),
    prisma.gstHsnMaster.findMany({ select: { id: true, code: true } }),
  ]);
  const profileOf = new Map(profiles.map((p) => [p.productId, p]));
  const codeOf = new Map(hsn.map((h) => [h.id, h.code]));
  const mappingOf = new Map<string, (typeof mappings)[number]>();
  for (const m of mappings) if (m.productId && !mappingOf.has(m.productId)) mappingOf.set(m.productId, m);

  return products.map((product) => {
    const profile = profileOf.get(product.id);
    const composition: Composition = profile
      ? asComposition(profile)
      : { baseMetal: null, platingType: "UNKNOWN", platingMetal: null, preciousMetal: null, preciousPurity: null, gems: null, confirmedBy: null };
    const mapping = mappingOf.get(product.id);
    return {
      productId: product.id,
      name: product.name,
      category: product.category.name,
      priceCents: product.priceCents,
      infoStatus: computeInfoStatus(composition),
      missing: missingInformation(composition),
      suggested: suggestHeadings(composition).headings.map((h) => h.code),
      mapping: mapping ? { id: mapping.id, status: mapping.status, code: mapping.hsnId ? codeOf.get(mapping.hsnId) ?? null : null, effectiveFrom: mapping.effectiveFrom.toISOString().slice(0, 10), approvedBy: mapping.approvedBy } : null,
    };
  });
}
