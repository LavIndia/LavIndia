"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { css } from "styled-system/css";
import { usePopoverDismiss } from "./usePopoverDismiss";
import {
  chipRowStyle,
  chipStyle,
  labelStyle,
  popoverStyle,
  triggerStyle,
  wrapStyle,
} from "./stock-cell.styles";
import { reasonsForDirection, type CountReasonCode } from "@/modules/inventory/count-reasons";

/**
 * Correcting stock where it is already displayed.
 *
 * The owner can see the number is wrong, so the fix belongs on that number —
 * not behind a navigation, a type dropdown and a sentence to compose. Tap it,
 * type what is actually on the shelf, tap why. Two taps and a number.
 *
 * The ledger still gets a full, reasoned entry; the ceremony is what was
 * removed, not the record.
 */
const deltaStyle = (up: boolean) =>
  css({ fontSize: "xs", fontWeight: "medium", color: up ? "emerald.500" : "red.600" });

export function StockCountCell({
  variantId,
  locationId,
  quantity,
}: {
  variantId: string;
  locationId: string;
  /** On hand — what is physically on the shelf. Available is derived from it. */
  quantity: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [counted, setCounted] = useState(String(quantity));
  const [saving, setSaving] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const closePopover = useCallback(() => setOpen(false), []);

  useEffect(() => setCounted(String(quantity)), [quantity]);

  usePopoverDismiss(open, wrapRef, closePopover);

  const parsed = parseInt(counted, 10);
  const target = Number.isFinite(parsed) && parsed >= 0 ? parsed : quantity;
  const delta = target - quantity;

  const save = async (reasonCode: CountReasonCode) => {
    if (delta === 0 || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/inventory/count", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId, locationId, countedQuantity: target, reasonCode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Could not update stock");
        return;
      }
      toast.success(`Stock set to ${data.quantity}`);
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Could not reach the server. Nothing was changed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <span className={wrapStyle} ref={wrapRef}>
      <button
        type="button"
        className={triggerStyle}
        onClick={() => setOpen((v) => !v)}
        aria-label={`Correct count, currently ${quantity} on hand`}
        aria-expanded={open}
      >
        {quantity}
      </button>

      {open && (
        <div className={popoverStyle}>
          <label className={labelStyle} htmlFor={`count-${variantId}`}>
            Actual count on the shelf
          </label>
          <Input
            id={`count-${variantId}`}
            type="number"
            min={0}
            value={counted}
            autoFocus
            onFocus={(event) => event.currentTarget.select()}
            onChange={(event) => setCounted(event.target.value)}
            className={css({ textAlign: "right", fontVariantNumeric: "tabular-nums" })}
          />

          {delta === 0 ? (
            <span className={labelStyle}>Matches the system. Nothing to change.</span>
          ) : (
            <>
              <span className={deltaStyle(delta > 0)}>
                {delta > 0 ? `+${delta}` : delta} · was {quantity}
              </span>
              <span className={labelStyle}>Why?</span>
              <div className={chipRowStyle}>
                {reasonsForDirection(delta).map((reason) => (
                  <button
                    key={reason.code}
                    type="button"
                    className={chipStyle}
                    disabled={saving}
                    onClick={() => save(reason.code)}
                  >
                    {reason.label}
                  </button>
                ))}
              </div>
              {saving && (
                <span className={labelStyle}>
                  <Loader2
                    className={css({
                      height: "3",
                      width: "3",
                      display: "inline",
                      marginRight: "1",
                      animation: "spin 1s linear infinite",
                    })}
                  />
                  Saving
                </span>
              )}
            </>
          )}
        </div>
      )}
    </span>
  );
}
