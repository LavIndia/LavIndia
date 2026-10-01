/**
 * A stored code with no curated label yet → words a person can read.
 *
 * "OUT_FOR_DELIVERY" → "Out for delivery", "netbanking" → "Netbanking".
 * Only the fallback: anything shown regularly deserves a proper entry in its
 * own label map. Values that are not a plain code ("—", an id) pass through.
 */
export function humaniseCode(code: string): string {
  if (!/^[A-Za-z_]+$/.test(code)) return code;
  const words = code.replace(/_/g, " ").trim().toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
