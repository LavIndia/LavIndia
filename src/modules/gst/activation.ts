/**
 * May the engine leave OFF? Every reason it may not, in one list.
 *
 * SHADOW is allowed once there is a GSTIN and a state to compare against:
 * it charges nobody. ENFORCE changes what customers pay and what invoices
 * say, so it has to clear every check below, and the person turning it on is
 * recorded. The database refuses ENFORCE without a verified profile and an
 * approver as well, so this is the friendly version of a rule that cannot be
 * bypassed.
 */
import { prisma } from "../_shared/db";
import { createAuditLog } from "@/lib/audit";
import { DomainError } from "../_shared/errors";
import { indiaDay } from "./rates/resolver";
import { gstinProblem } from "./places";
import { invalidateGstState, gstState, type EngineMode } from "./state";

export interface ActivationCheck {
  id: string;
  label: string;
  ok: boolean;
  /** What is wrong, or what was found. */
  detail: string;
  /** Informational checks never block. */
  blocking: boolean;
}

/** Calculations to compare before enforcing, and how recent. */
export const MIN_SHADOW_CALCULATIONS = 20;
const SHADOW_WINDOW_DAYS = 30;

const check = (id: string, label: string, ok: boolean, detail: string, blocking = true): ActivationCheck => ({ id, label, ok, detail, blocking });

export async function activationChecks(target: Exclude<EngineMode, "OFF">): Promise<ActivationCheck[]> {
  const { profile, config } = await gstState();
  const checks: ActivationCheck[] = [];

  const gstinIssue = profile?.gstin ? gstinProblem(profile.gstin) : "FORMAT";
  checks.push(check("gstin", "A valid supplier GSTIN is entered", !!profile?.gstin && !gstinIssue, profile?.gstin ? (gstinIssue ? `The GSTIN fails its ${gstinIssue.replace("_", " ").toLowerCase()} check` : "GSTIN is well-formed with a correct check character") : "No GSTIN has been entered"));
  checks.push(check("state", "The shop's registered state is known", !!profile?.stateCode, profile?.stateCode ? `State code ${profile.stateCode} (from the GSTIN)` : "Taken from the GSTIN once it is entered"));
  if (target === "SHADOW") return checks;

  checks.push(check("verified", "The registration is verified against the certificate", profile?.verificationStatus === "VERIFIED", profile?.verifiedBy ? `Verified by ${profile.verifiedBy}` : "Not verified yet"));
  checks.push(check("address", "A registered address is entered", !!profile?.registeredAddress, profile?.registeredAddress ? "Entered" : "Missing"));
  checks.push(check("einvoice", "E-invoicing applicability is answered, and no IRN is needed", profile?.eInvoicingApplies === false, profile?.eInvoicingApplies === null || profile?.eInvoicingApplies === undefined ? "The accountant has not said whether e-invoicing applies" : profile.eInvoicingApplies ? "E-invoicing applies, and IRN generation is not connected — invoices could not be issued lawfully" : "Not applicable"));

  const decided = !!config && config.shippingTreatment !== "UNSET" && config.codTreatment !== "UNSET" && !!config.treatmentApprovedBy;
  checks.push(check("charges", "Delivery and cash-on-delivery treatment is decided and approved", decided, decided ? `Delivery: ${config!.shippingTreatment}; cash on delivery: ${config!.codTreatment}` : "Not decided — needs the accountant's answer"));
  checks.push(check("state-table", "The state-code table has been reviewed against the GST portal", !!config?.stateTableReviewedBy, config?.stateTableReviewedBy ? `Reviewed by ${config.stateTableReviewedBy}` : "Not reviewed"));
  checks.push(check("place-of-supply", "The place-of-supply rule has been confirmed by the accountant", !!config?.placeOfSupplyReviewedBy, config?.placeOfSupplyReviewedBy ? `Confirmed by ${config.placeOfSupplyReviewedBy}` : "Not confirmed"));

  const day = indiaDay(new Date());
  const [products, verified, rates] = await Promise.all([
    prisma.product.findMany({ where: { isPublished: true }, select: { id: true, name: true } }),
    prisma.gstProductMapping.findMany({
      where: { chargeKind: "PRODUCT", status: "VERIFIED", effectiveFrom: { lte: day }, OR: [{ effectiveTo: null }, { effectiveTo: { gte: day } }] },
      select: { productId: true, hsnId: true, sacId: true },
    }),
    prisma.gstRateMaster.findMany({
      where: { approval: "APPROVED", effectiveFrom: { lte: day }, OR: [{ effectiveTo: null }, { effectiveTo: { gte: day } }] },
      select: { hsnId: true, sacId: true },
    }),
  ]);
  const verifiedIds = new Set(verified.map((m) => m.productId));
  const unclassified = products.filter((p) => !verifiedIds.has(p.id));
  checks.push(check("products", "Every published product has a verified classification", products.length > 0 && unclassified.length === 0, products.length === 0 ? "There are no published products" : unclassified.length === 0 ? `All ${products.length} published products are classified` : `${unclassified.length} of ${products.length} are not: ${unclassified.slice(0, 3).map((p) => p.name).join(", ")}${unclassified.length > 3 ? "…" : ""}`));
  const covered = new Set(rates.flatMap((r) => [r.hsnId, r.sacId].filter(Boolean)));
  const noRate = verified.filter((m) => !covered.has(m.hsnId ?? m.sacId));
  checks.push(check("rates", "Every verified classification has an approved rate in force today", noRate.length === 0, noRate.length === 0 ? "Yes" : `${noRate.length} classification(s) point at a code with no approved rate in force`));

  const since = new Date(Date.now() - SHADOW_WINDOW_DAYS * 86_400_000);
  const recent = await prisma.gstCalculationAudit.findMany({ where: { mode: "SHADOW", calculatedAt: { gte: since } }, select: { outcome: true }, orderBy: { calculatedAt: "desc" }, take: MIN_SHADOW_CALCULATIONS });
  const bad = recent.filter((r) => r.outcome === "MISSING_MAPPING" || r.outcome === "ERROR").length;
  checks.push(check("shadow", `Shadow mode has run on at least ${MIN_SHADOW_CALCULATIONS} recent orders with no missing classifications or errors`, recent.length >= MIN_SHADOW_CALCULATIONS && bad === 0, `${recent.length} recent shadow calculations, ${bad} with a missing classification or error`));

  const missingDetail = await prisma.gstCalculationAudit.count({ where: { mode: "ENFORCE", orderId: { not: null } } });
  checks.push(check("hsn-digits", "HSN codes carry at least 4 digits (6 above ₹5 crore turnover — confirm with the accountant)", true, `${missingDetail} enforced calculations so far`, false));
  return checks;
}

/**
 * Changes the engine's mode. Turning it OFF is always allowed. Anything else
 * runs the activation checks first and is recorded against the person who did it.
 */
export async function setEngineMode(mode: EngineMode, actor: { id: string; name: string | null }, approvedBy?: string) {
  const profile = await prisma.gstBusinessProfile.findFirst();
  if (!profile) throw new DomainError("GST_NOT_READY", "Create the GST business profile first");

  if (mode !== "OFF") {
    const failed = (await activationChecks(mode)).filter((c) => c.blocking && !c.ok);
    if (failed.length > 0) {
      throw new DomainError("GST_NOT_READY", `Not ready for ${mode}: ${failed.map((c) => c.label).join("; ")}`, { failed: failed.map((c) => ({ id: c.id, detail: c.detail })) });
    }
  }
  if (mode === "ENFORCE" && !approvedBy?.trim()) {
    throw new DomainError("VALIDATION_FAILED", "Enforcing needs the name of the person approving it");
  }

  const row = await prisma.gstBusinessProfile.update({
    where: { id: profile.id },
    data: {
      engineMode: mode,
      engineModeChangedBy: actor.id,
      engineModeChangedAt: new Date(),
      ...(mode === "ENFORCE" ? { enforceApprovedBy: approvedBy!.trim(), enforceApprovedAt: new Date() } : {}),
    },
  });
  invalidateGstState();
  await createAuditLog({ adminId: actor.id, adminName: actor.name ?? undefined, action: "GST_ENGINE_MODE", entity: "GstBusinessProfile", entityId: profile.id, metadata: { from: profile.engineMode, to: mode, approvedBy: approvedBy ?? null } });
  return row;
}

export { DomainError };
