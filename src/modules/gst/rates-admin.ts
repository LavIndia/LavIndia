/**
 * Maintaining the rate master: codes, notifications and rate versions.
 *
 * Two rules sit above the database's own:
 *   - A rate is only APPROVED when the notification it rests on has been
 *     verified by a person against the official text. Finding a rate in a
 *     document is not the same as having checked the document.
 *   - A new version of a rate closes the one it replaces the day before it
 *     starts; an old version is never edited or deleted, so what applied to
 *     any past sale can always be shown.
 */
import { prisma } from "../_shared/db";
import { DomainError } from "../_shared/errors";
import { createAuditLog } from "@/lib/audit";

export interface Actor {
  id: string;
  name: string | null;
}

const day = (value: string) => new Date(`${value}T00:00:00.000Z`);

export interface NotificationInput {
  number: string;
  issuedOn?: string | null;
  effectiveFrom?: string | null;
  title?: string | null;
  sourceUrl?: string | null;
  authority?: string;
  notes?: string | null;
}

export async function createNotification(input: NotificationInput, actor: Actor) {
  if (!input.number.trim()) throw new DomainError("VALIDATION_FAILED", "The notification number is required");
  if (input.sourceUrl && !/^https:\/\//.test(input.sourceUrl)) throw new DomainError("VALIDATION_FAILED", "The source link must start with https://");
  const row = await prisma.gstNotification.create({
    data: { number: input.number.trim(), issuedOn: input.issuedOn ? day(input.issuedOn) : null, effectiveFrom: input.effectiveFrom ? day(input.effectiveFrom) : null, title: input.title?.trim() || null, sourceUrl: input.sourceUrl?.trim() || null, authority: input.authority?.trim() || "CBIC", notes: input.notes?.trim() || null },
  });
  await createAuditLog({ adminId: actor.id, adminName: actor.name ?? undefined, action: "GST_NOTIFICATION_ADDED", entity: "GstNotification", entityId: row.id, metadata: { number: row.number } });
  return row;
}

/** Records that a person has compared this notification with the official text. */
export async function verifyNotification(id: string, verifiedBy: string, actor: Actor, notes?: string | null) {
  if (!verifiedBy.trim()) throw new DomainError("VALIDATION_FAILED", "Say who checked it against the official text");
  const row = await prisma.gstNotification.update({ where: { id }, data: { verifiedBy: `${verifiedBy.trim()} (entered by ${actor.name ?? actor.id})`, verifiedAt: new Date(), ...(notes ? { notes } : {}) } });
  await createAuditLog({ adminId: actor.id, adminName: actor.name ?? undefined, action: "GST_NOTIFICATION_VERIFIED", entity: "GstNotification", entityId: id, metadata: { verifiedBy } });
  return row;
}

export async function saveCode(kind: "HSN" | "SAC", code: string, description: string, actor: Actor) {
  const clean = code.trim();
  if (kind === "HSN" ? !/^[0-9]{2}([0-9]{2}([0-9]{2}([0-9]{2})?)?)?$/.test(clean) : !/^99[0-9]{2}([0-9]{2})?$/.test(clean)) {
    throw new DomainError("VALIDATION_FAILED", kind === "HSN" ? "An HSN is 2, 4, 6 or 8 digits" : "A SAC is 4 or 6 digits starting 99");
  }
  if (!description.trim()) throw new DomainError("VALIDATION_FAILED", "The tariff description is required");
  const row = kind === "HSN"
    ? await prisma.gstHsnMaster.upsert({ where: { code: clean }, create: { code: clean, description: description.trim() }, update: { description: description.trim() } })
    : await prisma.gstSacMaster.upsert({ where: { code: clean }, create: { code: clean, description: description.trim() }, update: { description: description.trim() } });
  await createAuditLog({ adminId: actor.id, adminName: actor.name ?? undefined, action: `GST_${kind}_SAVED`, entity: kind === "HSN" ? "GstHsnMaster" : "GstSacMaster", entityId: row.id, metadata: { code: clean } });
  return row;
}

export interface DraftRateInput {
  hsnId?: string | null;
  sacId?: string | null;
  /** The total rate in basis points; the central/state split is half and half. */
  rateBps: number;
  cessBps?: number;
  effectiveFrom: string;
  minUnitValueCents?: number | null;
  maxUnitValueCents?: number | null;
  notificationId?: string | null;
  notes?: string | null;
}

/** A new rate version, always DRAFT. Approving it is a separate, answerable step. */
export async function createDraftRate(input: DraftRateInput, actor: Actor) {
  if (!!input.hsnId === !!input.sacId) throw new DomainError("VALIDATION_FAILED", "Choose either an HSN or a SAC");
  if (!Number.isInteger(input.rateBps) || input.rateBps < 0 || input.rateBps > 10_000) throw new DomainError("VALIDATION_FAILED", "The rate must be between 0% and 100%");
  if (input.rateBps % 2 !== 0) throw new DomainError("VALIDATION_FAILED", "The central and state halves must be equal: use an even number of basis points");
  const row = await prisma.gstRateMaster.create({
    data: {
      hsnId: input.hsnId ?? null, sacId: input.sacId ?? null,
      rateBps: input.rateBps, cgstBps: input.rateBps / 2, sgstBps: input.rateBps / 2, igstBps: input.rateBps, cessBps: input.cessBps ?? 0,
      effectiveFrom: day(input.effectiveFrom),
      minUnitValueCents: input.minUnitValueCents ?? null, maxUnitValueCents: input.maxUnitValueCents ?? null,
      notificationId: input.notificationId ?? null, approval: "DRAFT", notes: input.notes?.trim() || null,
    },
  });
  await createAuditLog({ adminId: actor.id, adminName: actor.name ?? undefined, action: "GST_RATE_DRAFTED", entity: "GstRateMaster", entityId: row.id, metadata: { rateBps: row.rateBps, effectiveFrom: input.effectiveFrom } });
  return row;
}

const OVERLAP = /already covers|overlapping/i;

/** Approves a DRAFT rate, closing the version it replaces. Needs a verified notification. */
export async function approveRate(rateId: string, approverName: string, actor: Actor) {
  if (!approverName.trim()) throw new DomainError("VALIDATION_FAILED", "The approver's name is required");
  const rate = await prisma.gstRateMaster.findUnique({ where: { id: rateId }, include: { notification: true } });
  if (!rate) throw new DomainError("NOT_FOUND", "That rate does not exist");
  if (rate.approval === "APPROVED") throw new DomainError("CONFLICT", "That rate is already approved");
  if (!rate.notification) throw new DomainError("VALIDATION_FAILED", "A rate must cite the notification it rests on before it can be approved");
  if (!rate.notification.verifiedBy || !rate.notification.verifiedAt) {
    throw new DomainError("VALIDATION_FAILED", `Notification ${rate.notification.number} has not been verified against the official text, so this rate cannot be approved yet`);
  }

  try {
    const approved = await prisma.$transaction(async (tx) => {
      const before = new Date(rate.effectiveFrom.getTime() - 86_400_000);
      await tx.gstRateMaster.updateMany({
        where: { approval: "APPROVED", effectiveTo: null, id: { not: rate.id }, effectiveFrom: { lt: rate.effectiveFrom }, hsnId: rate.hsnId, sacId: rate.sacId, minUnitValueCents: rate.minUnitValueCents, maxUnitValueCents: rate.maxUnitValueCents },
        data: { effectiveTo: before },
      });
      return tx.gstRateMaster.update({ where: { id: rate.id }, data: { approval: "APPROVED", approvedBy: `${approverName.trim()} (entered by ${actor.name ?? actor.id})`, approvedAt: new Date() } });
    });
    await createAuditLog({ adminId: actor.id, adminName: actor.name ?? undefined, action: "GST_RATE_APPROVED", entity: "GstRateMaster", entityId: rate.id, metadata: { approver: approverName.trim(), rateBps: rate.rateBps } });
    return approved;
  } catch (error) {
    if (error instanceof Error && OVERLAP.test(error.message)) throw new DomainError("CONFLICT", "An approved rate already covers that code for an overlapping period or value band");
    throw error;
  }
}
