/**
 * Carries "these pieces were just added — now book their stock" from
 * Products to Receive Stock, so nothing has to be searched for or typed
 * twice. sessionStorage is enough: it only lives for the one trip between
 * the two screens, and the Receive screen empties it on arrival.
 */
const KEY = "lavindia:receive-handoff";

export interface ReceiveHandoffItem {
  productId: string;
  /** Units to receive for each variant of the product; 1 when not given. */
  quantity?: number;
}

export function queueReceive(items: ReceiveHandoffItem[]): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // Storage blocked — the operator can still search for the piece.
  }
}

export function takeQueuedReceive(): ReceiveHandoffItem[] {
  try {
    const raw = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
