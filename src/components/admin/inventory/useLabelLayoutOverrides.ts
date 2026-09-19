"use client";

import { useCallback, useEffect, useState } from "react";
import type { LabelFormat } from "@/modules/catalog/barcodes/label-formats";
import {
  defaultLayoutOverrides,
  type LabelLayoutOverrides,
} from "@/modules/catalog/barcodes/label-layout";

const STORAGE_KEY = "lavindia.barcode-label-layout";

/**
 * The admin's label layout adjustments, remembered per format.
 *
 * Kept in `localStorage` rather than the database on purpose: this is one
 * person's preference about their own printer and their own label stock, not
 * a catalog fact, and it should not follow anyone else around. Reading is
 * deferred to an effect so the server-rendered and first client render agree.
 */
export function useLabelLayoutOverrides(format: LabelFormat) {
  const [stored, setStored] = useState<Record<string, LabelLayoutOverrides>>({});

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setStored(JSON.parse(raw) as Record<string, LabelLayoutOverrides>);
    } catch {
      // A corrupt or unavailable store is not worth failing a print over —
      // the computed defaults are perfectly usable on their own.
    }
  }, []);

  const overrides = { ...defaultLayoutOverrides(format), ...stored[format.id] };

  const setOverrides = useCallback(
    (next: LabelLayoutOverrides) => {
      setStored((current) => {
        const updated = { ...current, [format.id]: next };
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch {
          // Preference lost on reload; the session still works.
        }
        return updated;
      });
    },
    [format.id],
  );

  return [overrides, setOverrides] as const;
}
