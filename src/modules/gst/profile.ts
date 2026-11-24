/**
 * The shop's GST registration, as supplied from its registration certificate.
 *
 * Nothing is assumed: the GSTIN, state and address stay empty until a person
 * enters them, the state is read from the GSTIN rather than typed separately,
 * and the profile is only VERIFIED when someone says they have checked it
 * against the certificate. Changing the GSTIN afterwards drops the profile
 * back to pending and turns the engine OFF.
 */
import { prisma } from "../_shared/db";
import { DomainError } from "../_shared/errors";
import { gstinProblem, stateName } from "./places";
import { invalidateGstState } from "./state";

export interface ProfileInput {
  legalName?: string | null;
  tradeName?: string | null;
  gstin?: string | null;
  registeredAddress?: string | null;
  registrationType?: "REGULAR" | "COMPOSITION" | "UNREGISTERED";
  /** Whether e-invoicing applies — the accountant's answer. Null while unknown. */
  eInvoicingApplies?: boolean | null;
}

const PROBLEM_TEXT = {
  FORMAT: "That is not a GSTIN: it must be 15 characters in the GST pattern",
  STATE: "The first two digits are not a GST state code",
  CHECK_CHARACTER: "The last character does not match the rest — check for a typing mistake",
} as const;

const clean = (value: string | null | undefined) => (value?.trim() ? value.trim() : null);

export async function saveBusinessProfile(input: ProfileInput, actorId: string) {
  const existing = await prisma.gstBusinessProfile.findFirst();
  const gstin = input.gstin === undefined ? undefined : clean(input.gstin)?.toUpperCase() ?? null;

  if (gstin) {
    const problem = gstinProblem(gstin);
    if (problem) throw new DomainError("VALIDATION_FAILED", PROBLEM_TEXT[problem]);
  }

  const gstinChanged = gstin !== undefined && gstin !== (existing?.gstin ?? null);
  const data = {
    ...(input.legalName !== undefined ? { legalName: clean(input.legalName) } : {}),
    ...(input.tradeName !== undefined ? { tradeName: clean(input.tradeName) } : {}),
    ...(input.registeredAddress !== undefined ? { registeredAddress: clean(input.registeredAddress) } : {}),
    ...(input.registrationType ? { registrationType: input.registrationType } : {}),
    ...(input.eInvoicingApplies !== undefined ? { eInvoicingApplies: input.eInvoicingApplies } : {}),
    ...(gstin !== undefined
      ? { gstin, stateCode: gstin ? gstin.slice(0, 2) : null, stateName: gstin ? stateName(gstin.slice(0, 2)) : null }
      : {}),
    // A different registration is a different thing to verify.
    ...(gstinChanged
      ? { verificationStatus: "PENDING_VERIFICATION" as const, verifiedBy: null, verifiedAt: null, engineMode: "OFF" as const, enforceApprovedBy: null, enforceApprovedAt: null, engineModeChangedBy: actorId, engineModeChangedAt: new Date() }
      : {}),
  };

  const row = existing
    ? await prisma.gstBusinessProfile.update({ where: { id: existing.id }, data })
    : await prisma.gstBusinessProfile.create({ data });
  invalidateGstState();
  return row;
}

/** Marks the registration verified against the certificate. Refuses if anything is missing. */
export async function verifyBusinessProfile(verifiedBy: string, actorId: string) {
  const profile = await prisma.gstBusinessProfile.findFirst();
  if (!profile) throw new DomainError("VALIDATION_FAILED", "There is no GST business profile yet");
  const missing = [
    ["legal name", profile.legalName],
    ["GSTIN", profile.gstin],
    ["registered address", profile.registeredAddress],
  ].filter(([, value]) => !value).map(([label]) => label);
  if (missing.length > 0) throw new DomainError("VALIDATION_FAILED", `Still missing: ${missing.join(", ")}`);
  if (!verifiedBy.trim()) throw new DomainError("VALIDATION_FAILED", "Say who checked it against the registration certificate");
  const row = await prisma.gstBusinessProfile.update({
    where: { id: profile.id },
    data: { verificationStatus: "VERIFIED", verifiedBy: `${verifiedBy.trim()} (entered by ${actorId})`, verifiedAt: new Date() },
  });
  invalidateGstState();
  return row;
}
