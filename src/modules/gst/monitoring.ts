/**
 * Keeping up with the notifications that change GST rates.
 *
 * Two small tools, and a rule. Watches notice when an official page changes so
 * a person reads it; proposals hold a change somebody has spotted, with its
 * source and dates, until somebody reviews it. Accepting a proposal creates a
 * DRAFT rate — never an approved one — and approving that is the usual,
 * separately answered step (rates-admin.ts), which requires a verified
 * notification. Nothing here parses legal text or publishes a rate by itself.
 *
 * Pages are only fetched from official domains, over https, and only by an
 * administrator's request, so this cannot be pointed at an internal address.
 */
import { createHash } from "crypto";
import { prisma } from "../_shared/db";
import { DomainError } from "../_shared/errors";
import { createAuditLog } from "@/lib/audit";
import { createDraftRate, type Actor } from "./rates-admin";

/** Domains an official source may be fetched from. */
export const OFFICIAL_HOSTS = [
  "cbic-gst.gov.in", "cbic.gov.in", "taxinformation.cbic.gov.in", "gst.gov.in", "gstcouncil.gov.in",
  "pib.gov.in", "egazette.gov.in", "indiacode.nic.in", "dgft.gov.in",
];

export function isOfficialUrl(value: string): boolean {
  let url: URL;
  try { url = new URL(value); } catch { return false; }
  if (url.protocol !== "https:" || url.username || url.password) return false;
  if (url.port && url.port !== "443") return false;
  const host = url.hostname.toLowerCase();
  return OFFICIAL_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

export async function addWatch(label: string, url: string, actor: Actor) {
  if (!label.trim()) throw new DomainError("VALIDATION_FAILED", "Give the page a label");
  if (!isOfficialUrl(url)) throw new DomainError("VALIDATION_FAILED", `Only official https pages can be watched (${OFFICIAL_HOSTS.join(", ")})`);
  const row = await prisma.gstSourceWatch.create({ data: { label: label.trim(), url: url.trim(), createdBy: actor.id } });
  await createAuditLog({ adminId: actor.id, adminName: actor.name ?? undefined, action: "GST_WATCH_ADDED", entity: "GstSourceWatch", entityId: row.id, metadata: { url } });
  return row;
}

const MAX_BYTES = 2_000_000;

/** Fetches a watched page and records whether it changed since last time. */
export async function checkWatch(id: string) {
  const watch = await prisma.gstSourceWatch.findUnique({ where: { id } });
  if (!watch) throw new DomainError("NOT_FOUND", "That watch does not exist");
  if (!isOfficialUrl(watch.url)) throw new DomainError("VALIDATION_FAILED", "That address is not an official source");

  let status: string;
  let hash: string | null = null;
  try {
    // Redirects are not followed: a page that bounces elsewhere is reported, not fetched.
    const response = await fetch(watch.url, { redirect: "manual", signal: AbortSignal.timeout(10_000), headers: { "user-agent": "LavIndia-GST-monitor/1.0" } });
    status = `HTTP ${response.status}`;
    if (response.status >= 300 && response.status < 400) {
      const target = response.headers.get("location");
      status += target && isOfficialUrl(new URL(target, watch.url).toString()) ? " (redirects within official domains; update the watched address)" : " (redirects off the official domains; not followed)";
    } else if (response.ok) {
      const body = Buffer.from(await response.arrayBuffer());
      if (body.length > MAX_BYTES) status = `HTTP ${response.status}, page larger than ${MAX_BYTES} bytes; not hashed`;
      else hash = createHash("sha256").update(body).digest("hex");
    }
  } catch (error) {
    status = error instanceof Error ? `Could not be read: ${error.message.slice(0, 120)}` : "Could not be read";
  }

  const changed = !!hash && !!watch.lastHash && hash !== watch.lastHash;
  return prisma.gstSourceWatch.update({
    where: { id },
    data: { lastCheckedAt: new Date(), lastStatus: status, ...(hash ? { lastHash: hash } : {}), ...(changed ? { lastChangedAt: new Date(), changeAcknowledgedAt: null, changeAcknowledgedBy: null } : {}) },
  });
}

export async function acknowledgeWatchChange(id: string, actor: Actor) {
  return prisma.gstSourceWatch.update({ where: { id }, data: { changeAcknowledgedAt: new Date(), changeAcknowledgedBy: actor.id } });
}

export interface ProposalInput {
  title: string;
  notificationId?: string | null;
  sourceUrl?: string | null;
  noticeDate?: string | null;
  effectiveFrom?: string | null;
  summary?: string | null;
  change: { code: string; codeKind: "HSN" | "SAC"; description: string; rateBps: number; cessBps?: number; minUnitValueCents?: number | null; maxUnitValueCents?: number | null };
}

export async function proposeChange(input: ProposalInput, actor: Actor) {
  if (!input.title.trim()) throw new DomainError("VALIDATION_FAILED", "Give the proposed change a title");
  if (input.sourceUrl && !/^https:\/\//.test(input.sourceUrl)) throw new DomainError("VALIDATION_FAILED", "The source link must start with https://");
  if (!Number.isInteger(input.change.rateBps) || input.change.rateBps < 0 || input.change.rateBps % 2 !== 0) throw new DomainError("VALIDATION_FAILED", "The proposed rate must be an even number of basis points");
  const day = (v?: string | null) => (v ? new Date(`${v}T00:00:00.000Z`) : null);
  const row = await prisma.gstRateProposal.create({
    data: { title: input.title.trim(), notificationId: input.notificationId ?? null, sourceUrl: input.sourceUrl?.trim() || null, noticeDate: day(input.noticeDate), effectiveFrom: day(input.effectiveFrom), summary: input.summary?.trim() || null, proposedChange: input.change as object, createdBy: actor.id },
  });
  await createAuditLog({ adminId: actor.id, adminName: actor.name ?? undefined, action: "GST_PROPOSAL_ADDED", entity: "GstRateProposal", entityId: row.id, metadata: { title: row.title } });
  return row;
}

export async function reviewProposal(id: string, decision: "IN_REVIEW" | "ACCEPT" | "REJECT", reviewer: string, note: string | null, actor: Actor) {
  const proposal = await prisma.gstRateProposal.findUnique({ where: { id } });
  if (!proposal) throw new DomainError("NOT_FOUND", "That proposal does not exist");
  if (proposal.status === "ACCEPTED" || proposal.status === "REJECTED") throw new DomainError("CONFLICT", "That proposal has already been decided");
  if (decision === "IN_REVIEW") return prisma.gstRateProposal.update({ where: { id }, data: { status: "IN_REVIEW" } });
  if (!reviewer.trim()) throw new DomainError("VALIDATION_FAILED", "Say who reviewed it");

  if (decision === "REJECT") {
    if (!note?.trim()) throw new DomainError("VALIDATION_FAILED", "Give the reason for rejecting it");
    return prisma.gstRateProposal.update({ where: { id }, data: { status: "REJECTED", reviewedBy: reviewer.trim(), reviewedAt: new Date(), reviewNote: note.trim() } });
  }

  if (!proposal.effectiveFrom) throw new DomainError("VALIDATION_FAILED", "The proposal needs an effective date before it can be accepted");
  const change = proposal.proposedChange as { code: string; codeKind: "HSN" | "SAC"; rateBps: number; cessBps?: number; minUnitValueCents?: number | null; maxUnitValueCents?: number | null };
  const code = change.codeKind === "HSN"
    ? await prisma.gstHsnMaster.findUnique({ where: { code: change.code } })
    : await prisma.gstSacMaster.findUnique({ where: { code: change.code } });
  if (!code) throw new DomainError("VALIDATION_FAILED", `${change.codeKind} ${change.code} is not in the master yet — add it first`);

  const draft = await createDraftRate({
    hsnId: change.codeKind === "HSN" ? code.id : null, sacId: change.codeKind === "SAC" ? code.id : null,
    rateBps: change.rateBps, cessBps: change.cessBps, effectiveFrom: proposal.effectiveFrom.toISOString().slice(0, 10),
    minUnitValueCents: change.minUnitValueCents, maxUnitValueCents: change.maxUnitValueCents, notificationId: proposal.notificationId,
    notes: `From proposal "${proposal.title}"${proposal.sourceUrl ? ` (${proposal.sourceUrl})` : ""}. DRAFT: not approved.`,
  }, actor);
  return prisma.gstRateProposal.update({ where: { id }, data: { status: "ACCEPTED", reviewedBy: reviewer.trim(), reviewedAt: new Date(), reviewNote: note?.trim() || null, createdRateId: draft.id } });
}
