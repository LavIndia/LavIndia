"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { css, cx } from "styled-system/css";
import {
  MAX_REORDER_POINT,
  SUGGESTED_REORDER_POINTS,
  isValidReorderPoint,
} from "@/modules/catalog/client";
import { usePopoverDismiss } from "./usePopoverDismiss";
import {
  chipRowStyle,
  chipStyle,
  labelStyle,
  popoverStyle,
  triggerStyle,
  wrapStyle,
} from "./stock-cell.styles";

/**
 * The reorder point, edited where it is shown: tap the number, pick a common
 * value or type one. It is a setting rather than a stock movement, so there
 * is no reason to give — but a retired piece is told plainly that the figure
 * no longer raises an alert.
 */
const chosenChipStyle = css({ borderColor: "accent.pressed", background: "gold.50", fontWeight: "semibold" });
const mutedTriggerStyle = css({ color: "fg.muted", fontWeight: "normal" });
const errorStyle = css({ fontSize: "xs", color: "danger" });
const inputRowStyle = css({ display: "flex", gap: "2", alignItems: "center" });

export function ReorderPointCell({
  variantId,
  reorderPoint,
  isRetired,
}: {
  variantId: string;
  reorderPoint: number;
  isRetired: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(String(reorderPoint));
  const [saving, setSaving] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const closePopover = useCallback(() => setOpen(false), []);

  useEffect(() => setDraft(String(reorderPoint)), [reorderPoint]);
  usePopoverDismiss(open, wrapRef, closePopover);

  const typed = draft.trim() === "" ? NaN : Number(draft);
  const valid = isValidReorderPoint(typed);

  const save = async (value: number) => {
    if (saving || !isValidReorderPoint(value)) return;
    if (value === reorderPoint) return setOpen(false);
    setSaving(true);
    try {
      const res = await fetch("/api/admin/inventory/reorder-point", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId, reorderPoint: value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Could not change the reorder point");
        return;
      }
      toast.success(`Reorder point set to ${data.reorderPoint}`);
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
        className={cx(triggerStyle, isRetired && mutedTriggerStyle)}
        onClick={() => setOpen((v) => !v)}
        aria-label={`Change reorder point, currently ${reorderPoint}`}
        aria-expanded={open}
      >
        {reorderPoint}
      </button>

      {open && (
        <div className={popoverStyle}>
          <span className={labelStyle}>Flag Low stock at or below</span>
          <div className={chipRowStyle}>
            {SUGGESTED_REORDER_POINTS.map((value) => (
              <button
                key={value}
                type="button"
                className={cx(chipStyle, value === reorderPoint && chosenChipStyle)}
                aria-pressed={value === reorderPoint}
                disabled={saving}
                onClick={() => save(value)}
              >
                {value}
              </button>
            ))}
          </div>
          <label className={labelStyle} htmlFor={`reorder-${variantId}`}>
            Or another number
          </label>
          <div className={inputRowStyle}>
            <Input
              id={`reorder-${variantId}`}
              type="number"
              inputMode="numeric"
              min={0}
              max={MAX_REORDER_POINT}
              step={1}
              value={draft}
              onFocus={(event) => event.currentTarget.select()}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && valid && save(typed)}
              className={css({ textAlign: "right", fontVariantNumeric: "tabular-nums" })}
            />
            <Button
              type="button"
              size="sm"
              isDisabled={!valid || saving || typed === reorderPoint}
              onPress={() => save(typed)}
            >
              {saving ? "Saving" : "Save"}
            </Button>
          </div>
          {!valid && (
            <span className={errorStyle}>A whole number from 0 to {MAX_REORDER_POINT}.</span>
          )}
          {isRetired && (
            <span className={labelStyle}>
              Retired — this piece is never flagged Low stock, whatever is set here.
            </span>
          )}
        </div>
      )}
    </span>
  );
}
