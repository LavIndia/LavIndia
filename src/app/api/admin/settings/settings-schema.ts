import { z } from "zod";
import { isValidVpa } from "@/modules/payments/upi/upi-link";

/** What the settings form may change. Fields left out are left alone. */
export const settingsSchema = z.object({
  businessName: z.string().trim().min(1, "Enter the business name"),
  // No logoUrl: the logo is set only through /api/admin/settings/logo. This
  // form posts every field it holds, and a logo copied in when the page
  // loaded would otherwise put the old mark back over a fresh upload.
  address: z.string().optional().nullable(),
  contactNumber: z.string().optional().nullable(),
  // Optional: a blank box is stored as "no email", not rejected.
  email: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() || null : value),
    z.string().email("Enter a valid email address, e.g. care@yourshop.com").nullable().optional(),
  ),
  gstNumber: z.string().optional().nullable(),
  // UPI collection details. Validated as a VPA rather than free text, because
  // a malformed one silently produces a QR that pays nobody.
  upiVpa: z
    .string()
    .trim()
    .optional()
    .nullable()
    .refine((value) => !value || isValidVpa(value), {
      message: "That does not look like a valid UPI ID, e.g. yourname@okhdfcbank",
    }),
  upiPayeeName: z.string().trim().max(120).optional().nullable(),
  // Paise, so the fee is stored in the same unit as every other amount and
  // never accumulates rounding. Capped at a figure no delivery fee should
  // ever reach, which catches a rupees-entered-as-paise slip.
  codFeeCents: z.coerce.number().int().min(0).max(1_000_000).optional(),
  standardShippingCents: z.coerce.number().int().min(0).max(1_000_000).optional(),
  expressShippingCents: z.coerce.number().int().min(0).max(1_000_000).optional(),
  // Whether each channel's prices already include GST — decides whether the
  // tax is taken from the price or added on top.
  onlinePricesIncludeGst: z.boolean().optional(),
  storePricesIncludeGst: z.boolean().optional(),
  facebook: z.string().url().optional().nullable().or(z.literal("")),
  instagram: z.string().url().optional().nullable().or(z.literal("")),
  twitter: z.string().url().optional().nullable().or(z.literal("")),
  linkedin: z.string().url().optional().nullable().or(z.literal("")),
  amazonLink: z.string().url().optional().nullable().or(z.literal("")),
  flipkartLink: z.string().url().optional().nullable().or(z.literal("")),
  myntraLink: z.string().url().optional().nullable().or(z.literal("")),
  blinkitLink: z.string().url().optional().nullable().or(z.literal("")),
  zeptoLink: z.string().url().optional().nullable().or(z.literal("")),

  // The trust badges shown to a shopper. These were edited by the settings
  // screen but were absent here, and an object schema drops what it does not
  // declare — so every one of them was silently discarded on save and the
  // screen appeared to do nothing.
  codAvailable: z.boolean().optional(),
  customerCount: z.string().trim().max(40).optional(),
  rating: z.string().trim().max(10).optional(),
  // Not nullable: both carry a default in the database, so null would be
  // rejected on write where an omitted value is simply left alone.
  supportHoursStart: z.string().trim().max(10).optional(),
  supportHoursEnd: z.string().trim().max(10).optional(),

  // Search engine listing.
  metaTitle: z.string().trim().max(200).optional().nullable(),
  metaDescription: z.string().trim().max(500).optional().nullable(),
  metaKeywords: z.string().trim().max(500).optional().nullable(),

  // Footer.
  copyrightText: z.string().trim().max(300).optional(),
});

/**
 * The first problem in words the form can show as it is. Zod's own wording
 * ("Invalid url") does not say which box, so it gets the field name.
 */
export function settingsErrorMessage(error: z.ZodError): string {
  const issue = error.errors[0];
  if (!issue) return "Validation failed";
  const generic = /^(Invalid|Expected|Required|String must|Number must)/.test(issue.message);
  return generic
    ? `Check the ${issue.path.join(".")} field: ${issue.message.toLowerCase()}`
    : issue.message;
}
