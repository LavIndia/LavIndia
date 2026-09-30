"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { css } from "styled-system/css";
import type { OrderTier, PercentTier, PriceTier } from "@/modules/promotions/contracts";
import { hint, inlineMoney, inlineNumber, sentence } from "./editor.styles";
import { CountInput, MoneyInput } from "./MoneyInput";
import { rupees } from "@/modules/promotions/summarise";

const table = css({ display: "flex", flexDirection: "column", gap: "2" });
const icon = css({ width: "4", height: "4" });

function RemoveButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <Button type="button" variant="ghost" size="icon" aria-label="Remove tier" onClick={onClick} disabled={disabled}>
      <Trash2 className={icon} />
    </Button>
  );
}

/** "2 for ₹699 · 3 for ₹999 · 4 for ₹1,299", with the price per piece shown. */
export function SetTierEditor({ tiers, onChange }: { tiers: PriceTier[]; onChange: (t: PriceTier[]) => void }) {
  const set = (i: number, patch: Partial<PriceTier>) => onChange(tiers.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  return (
    <div className={table}>
      {tiers.map((tier, i) => (
        <div key={i} className={sentence}>
          <span>Any</span>
          <CountInput id={`tier-size-${i}`} ariaLabel="Pieces" className={inlineNumber} value={tier.size} onChange={(v) => set(i, { size: v ?? 1 })} />
          <span>pieces for</span>
          <MoneyInput id={`tier-price-${i}`} ariaLabel="Set price" className={inlineMoney} value={tier.priceCents} onChange={(v) => set(i, { priceCents: v ?? 0 })} />
          <span className={hint}>{tier.size > 0 && tier.priceCents > 0 ? `${rupees(Math.round(tier.priceCents / tier.size))} a piece` : ""}</span>
          <RemoveButton onClick={() => onChange(tiers.filter((_, j) => j !== i))} disabled={tiers.length <= 1} />
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => {
        const last = tiers[tiers.length - 1];
        onChange([...tiers, { size: (last?.size ?? 1) + 1, priceCents: last ? Math.round((last.priceCents / last.size) * (last.size + 1) * 0.95) : 99_900 }]);
      }}>
        <Plus className={icon} /> Add tier
      </Button>
    </div>
  );
}

/** "2+ pieces: 10% off · 3+ pieces: 15% off" — by pieces or by spend. */
export function PercentTierEditor({ basis, tiers, onChange }: { basis: "QUANTITY" | "SUBTOTAL"; tiers: PercentTier[]; onChange: (t: PercentTier[]) => void }) {
  const set = (i: number, patch: Partial<PercentTier>) => onChange(tiers.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  return (
    <div className={table}>
      {tiers.map((tier, i) => (
        <div key={i} className={sentence}>
          <span>{basis === "QUANTITY" ? "Buy" : "Spend"}</span>
          {basis === "QUANTITY" ? (
            <CountInput id={`ptier-min-${i}`} ariaLabel="Pieces" className={inlineNumber} value={tier.min} onChange={(v) => set(i, { min: v ?? 1 })} />
          ) : (
            <MoneyInput id={`ptier-min-${i}`} ariaLabel="Spend" className={inlineMoney} value={tier.min} onChange={(v) => set(i, { min: v ?? 1 })} />
          )}
          <span>{basis === "QUANTITY" ? "or more, get" : "or more, get"}</span>
          <CountInput id={`ptier-pct-${i}`} ariaLabel="Percent off" className={inlineNumber} value={tier.bps / 100} onChange={(v) => set(i, { bps: Math.round((v ?? 0) * 100) })} />
          <span>% off</span>
          <RemoveButton onClick={() => onChange(tiers.filter((_, j) => j !== i))} disabled={tiers.length <= 1} />
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => {
        const last = tiers[tiers.length - 1];
        onChange([...tiers, { min: (last?.min ?? 1) + (basis === "QUANTITY" ? 1 : 1_00_000), bps: Math.min(10_000, (last?.bps ?? 500) + 500) }]);
      }}>
        <Plus className={icon} /> Add tier
      </Button>
    </div>
  );
}

/** "Spend ₹5,000 → ₹500 off · Spend ₹10,000 → ₹1,200 off". */
export function OrderTierEditor({ tiers, onChange }: { tiers: OrderTier[]; onChange: (t: OrderTier[]) => void }) {
  const set = (i: number, patch: Partial<OrderTier>) => onChange(tiers.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  return (
    <div className={table}>
      {tiers.map((tier, i) => (
        <div key={i} className={sentence}>
          <span>Spend</span>
          <MoneyInput id={`otier-min-${i}`} ariaLabel="Spend" className={inlineMoney} value={tier.minSubtotalCents} onChange={(v) => set(i, { minSubtotalCents: v ?? 1 })} />
          <span>or more, get</span>
          <MoneyInput id={`otier-off-${i}`} ariaLabel="Amount off" className={inlineMoney} value={tier.amountOffCents ?? null} onChange={(v) => set(i, { amountOffCents: v, bps: null })} />
          <span>off</span>
          <RemoveButton onClick={() => onChange(tiers.filter((_, j) => j !== i))} disabled={tiers.length <= 1} />
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => {
        const last = tiers[tiers.length - 1];
        onChange([...tiers, { minSubtotalCents: (last?.minSubtotalCents ?? 0) + 5_00_000, amountOffCents: (last?.amountOffCents ?? 0) + 50_000 }]);
      }}>
        <Plus className={icon} /> Add tier
      </Button>
    </div>
  );
}
