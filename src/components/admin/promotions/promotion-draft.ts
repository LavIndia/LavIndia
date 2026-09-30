/**
 * The offer being edited, as the editor holds it.
 *
 * The same shape the server saves (PromotionInput), except dates are the
 * strings a datetime input produces. Money stays in paise throughout; the
 * rupee inputs convert at the edge.
 */
import type { PromotionInput } from "@/modules/promotions/schema";
import { templateById, type PromotionTemplate } from "@/modules/promotions/templates";

export type Draft = Omit<PromotionInput, "startsAt" | "endsAt"> & {
  startsAt: string;
  endsAt: string;
};

export type DraftPatch = Partial<Draft>;

/** Where "Describe your offer" leaves its draft for the editor to pick up. */
export const DESCRIBED_OFFER_KEY = "lavindia.describedOffer";

/** "2026-10-01T10:00" in the admin's own clock, for a datetime input. */
export function toLocalInput(value: Date | string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function draftFromTemplate(template: PromotionTemplate): Draft {
  const d = template.defaults;
  return {
    name: template.name,
    description: null,
    template: template.id,
    trigger: d.trigger ?? "AUTOMATIC",
    code: null,
    channels: d.channels ?? ["ONLINE", "STORE"],
    pieces: d.pieces ?? { include: [], exclude: [] },
    conditions: d.conditions ?? [],
    benefit: d.benefit,
    minQuantity: null,
    minSubtotalCents: d.minSubtotalCents ?? null,
    // An offer price is what the client pays, on either channel: online
    // prices already include GST, and at the counter the price is treated as
    // GST-inclusive too, so "3 for ₹999" costs ₹999 everywhere.
    priceIncludesTax: true,
    maxApplicationsPerOrder: null,
    maxDiscountCents: null,
    usageLimit: null,
    perCustomerLimit: null,
    budgetCents: null,
    combinesWithOtherClasses: d.combinesWithOtherClasses ?? false,
    exclusive: false,
    rank: null,
    startsAt: toLocalInput(new Date()),
    endsAt: "",
    isRecurring: d.isRecurring ?? false,
    recurrenceType: d.recurrenceType ?? null,
    recurrenceDaysOfWeek: [],
    recurrenceDayOfMonth: null,
    recurrenceStartTime: d.recurrenceStartTime ?? null,
    recurrenceEndTime: d.recurrenceEndTime ?? null,
    title: null,
    badge: null,
    nudgeText: null,
    appliedText: null,
    terms: null,
    invoiceLabel: null,
    showOnStorefront: true,
    slug: null,
  };
}

export function draftFromInput(input: PromotionInput): Draft {
  return { ...input, startsAt: toLocalInput(input.startsAt), endsAt: toLocalInput(input.endsAt) };
}

export function draftForTemplateId(id: string | undefined): Draft | null {
  const template = id ? templateById(id) : undefined;
  return template ? draftFromTemplate(template) : null;
}

/** What is sent to the server. */
export function toPayload(draft: Draft) {
  return {
    ...draft,
    startsAt: draft.startsAt ? new Date(draft.startsAt).toISOString() : null,
    endsAt: draft.endsAt ? new Date(draft.endsAt).toISOString() : null,
    recurrenceType: draft.isRecurring ? (draft.recurrenceType ?? "DAILY") : null,
  };
}

export const toRupees = (paise: number | null | undefined) =>
  paise === null || paise === undefined ? "" : String(paise / 100);

export const toPaise = (rupees: string): number | null => {
  const value = Number(rupees.replace(/[,₹\s]/g, ""));
  return rupees.trim() === "" || !Number.isFinite(value) ? null : Math.round(value * 100);
};
