/**
 * GST domain — public surface.
 *
 * An independent classification, calculation and invoicing system that sits
 * beside pricing and billing. It does nothing while its mode is OFF.
 */
export { calculateGst } from "./engine/calculate";
export { applyGstToQuote, quoteCartWithGst } from "./quote-gst";
export type { GstContext } from "./quote-gst";
export { recordGstAudit, recordGstAuditSafely } from "./audit";
export { engineMode, gstState, invalidateGstState } from "./state";
export type { EngineMode } from "./state";
export * from "./engine/types";
