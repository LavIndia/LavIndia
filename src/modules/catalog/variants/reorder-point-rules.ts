/**
 * Browser-safe reorder point rules, shared by the admin cell that edits the
 * value and the server that stores it. See `reorder-point.ts`.
 */
export const MAX_REORDER_POINT = 999;

/** The values offered first, before typing a number of one's own. */
export const SUGGESTED_REORDER_POINTS = [0, 1, 2, 3, 5, 10] as const;

export function isValidReorderPoint(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= MAX_REORDER_POINT;
}
