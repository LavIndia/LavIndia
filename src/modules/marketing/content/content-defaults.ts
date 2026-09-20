import type { ContentPageCopy } from "@/modules/marketing/content/content-types";
import { contactCopy } from "@/content/contact";
import { coreValuesCopy } from "@/content/core-values";
import { faqCopy } from "@/content/faq";
import { privacyPolicyCopy } from "@/content/privacy-policy";
import { returnExchangeCopy } from "@/content/return-exchange";
import { shippingPolicyCopy } from "@/content/shipping-policy";
import { storyCopy } from "@/content/story";
import { termsConditionsCopy } from "@/content/terms-conditions";

/**
 * The drafts every written page ships with.
 *
 * These are the fallback, not the source of truth: once an admin saves a page
 * the stored version wins. Keeping them means the storefront renders on a
 * database that has never been edited — a fresh environment, or production
 * before anyone has been through the copy — rather than showing a blank page
 * or a 404 where a policy should be.
 *
 * A slug may only be added here alongside a route of the same name, because
 * the slug is the public URL.
 */
export const CONTENT_PAGE_DEFAULTS: Record<string, ContentPageCopy> = {
  contact: contactCopy,
  story: storyCopy,
  "core-values": coreValuesCopy,
  faq: faqCopy,
  "privacy-policy": privacyPolicyCopy,
  "terms-conditions": termsConditionsCopy,
  "shipping-policy": shippingPolicyCopy,
  "return-exchange": returnExchangeCopy,
};

/** Every editable page, in the order the admin list shows them. */
export const CONTENT_PAGE_SLUGS = Object.keys(CONTENT_PAGE_DEFAULTS);

export function isContentPageSlug(slug: string): boolean {
  return Object.prototype.hasOwnProperty.call(CONTENT_PAGE_DEFAULTS, slug);
}

export function contentPageDefault(slug: string): ContentPageCopy | null {
  return CONTENT_PAGE_DEFAULTS[slug] ?? null;
}
