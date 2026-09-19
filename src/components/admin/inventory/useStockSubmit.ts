"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

/**
 * Submitting a stock operation, shared by Receive and Adjustments.
 *
 * Generates the idempotency key. The key is minted once per basket and kept
 * until that basket succeeds, so a double-click or a retry after a dropped
 * response is recognised by the server as the same operation rather than a
 * second one — which for stock is the difference between receiving 3 and
 * receiving 6.
 */
export function useStockSubmit(endpoint: string, onDone: () => void) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const keyRef = useRef<string | null>(null);

  const submit = useCallback(
    async (payload: Record<string, unknown>, successMessage: string) => {
      if (submitting) return;
      setSubmitting(true);

      keyRef.current ??= `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, idempotencyKey: keyRef.current }),
        });

        const data = await response.json();

        if (!response.ok) {
          // The server's message is the specific one — "Only 1 left of ..."
          // rather than a generic failure — so it is shown as-is.
          toast.error(data.error ?? "Could not update stock");
          return;
        }

        toast.success(successMessage);
        // A fresh basket gets a fresh key; reusing it would make the next
        // operation a no-op replay of this one.
        keyRef.current = null;
        onDone();
        router.refresh();
      } catch {
        toast.error("Could not reach the server. Nothing was changed.");
      } finally {
        setSubmitting(false);
      }
    },
    [endpoint, onDone, router, submitting],
  );

  return { submit, submitting };
}
