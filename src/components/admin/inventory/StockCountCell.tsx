"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { css } from "styled-system/css";
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
const triggerStyle = css({
  fontVariantNumeric: "tabular-nums",
  fontWeight: "semibold",
  paddingInline: "2",
  paddingBlock: "1",
  borderRadius: "sm",
  border: "1px solid transparent",
  cursor: "pointer",
  transition: "border-color 0.15s ease, background 0.15s ease",
  "&:hover": { borderColor: "border.subtle", background: "bg.canvas" },
});

const popoverStyle = css({
  position: "absolute",
  right: "0",
  top: "calc(100% + 6px)",
  zIndex: "50",
  width: "16rem",
  padding: "3",
  borderRadius: "md",
  border: "1px solid",
  borderColor: "border.subtle",
  background: "bg.surface",
  boxShadow: "lg",
  display: "flex",
  flexDirection: "column",
  gap: "2.5",
});

const wrapStyle = css({ position: "relative", display: "inline-block" });
const labelStyle = css({ fontSize: "xs", color: "fg.muted" });
const deltaStyle = (up: boolean) =>
  css({ fontSize: "xs", fontWeight: "medium", color: up ? "emerald.500" : "red.600" });
const chipRowStyle = css({ display: "flex", flexWrap: "wrap", gap: "1.5" });
const chipStyle = css({
  fontSize: "xs",
  paddingInline: "2",
  paddingBlock: "1",
  borderRadius: "full",
  border: "1px solid",
  borderColor: "border.subtle",
  cursor: "pointer",
  transition: "background 0.15s ease, border-color 0.15s ease",
  "&:hover": { borderColor: "accent.pressed", background: "gold.50" },
});

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

  useEffect(() => setCounted(String(quantity)), [quantity]);

  useEffect(() => {
    if (!open) return;
    const onAway = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onAway);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onAway);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

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
