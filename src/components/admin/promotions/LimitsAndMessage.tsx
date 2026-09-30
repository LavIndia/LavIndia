"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { Condition, PaymentInstrument } from "@/modules/promotions/contracts";
import { chipRow, field, grid2, grid3, hint, pill, toggleRow } from "./editor.styles";
import { CountInput, MoneyInput } from "./MoneyInput";
import type { Draft, DraftPatch } from "./promotion-draft";

type CardProps = { draft: Draft; set: (patch: DraftPatch) => void; isOrderOffer: boolean };

const PAYMENTS: Array<{ key: PaymentInstrument; label: string }> = [
  { key: "UPI", label: "UPI" },
  { key: "CARD", label: "Card" },
  { key: "CASH", label: "Cash" },
  { key: "COD", label: "Cash on delivery" },
];

function hasCondition(list: Condition[], type: Condition["type"]) {
  return list.some((c) => c.type === type);
}

/** Minimums, who qualifies, and how much the offer may give away. */
export function LimitsFields({ draft, set, isOrderOffer }: CardProps) {
  const minOrder = draft.conditions.find((c) => c.type === "minOrderSubtotal") as { cents: number } | undefined;
  const payments = (draft.conditions.find((c) => c.type === "paymentMethods") as { methods: PaymentInstrument[] } | undefined)?.methods ?? [];
  const withCondition = (type: Condition["type"], next: Condition | null) =>
    set({ conditions: [...draft.conditions.filter((c) => c.type !== type), ...(next ? [next] : [])] });

  return (
    <>
      <div className={grid2}>
        <div className={field}>
          <Label htmlFor="min-qty">{isOrderOffer ? "Minimum pieces in the order" : "Minimum matching pieces"}</Label>
          <CountInput id="min-qty" value={draft.minQuantity} onChange={(v) => set({ minQuantity: v })} placeholder="None" />
        </div>
        <div className={field}>
          <Label htmlFor="min-spend">{isOrderOffer ? "Minimum spend" : "Minimum spend on matching pieces"}</Label>
          <MoneyInput id="min-spend" value={draft.minSubtotalCents} onChange={(v) => set({ minSubtotalCents: v })} placeholder="None" />
        </div>
      </div>
      <div className={field}>
        <Label htmlFor="min-order">Only on orders worth at least</Label>
        <MoneyInput id="min-order" value={minOrder?.cents ?? null} onChange={(v) => withCondition("minOrderSubtotal", v ? { type: "minOrderSubtotal", cents: v } : null)} placeholder="Any order" />
      </div>

      <div className={field}>
        <Label>Who</Label>
        <div className={chipRow}>
          <button type="button" className={pill(!hasCondition(draft.conditions, "signedInOnly") && !hasCondition(draft.conditions, "firstOrderOnly"))} onClick={() => set({ conditions: draft.conditions.filter((c) => c.type !== "signedInOnly" && c.type !== "firstOrderOnly") })}>
            Everyone
          </button>
          <button type="button" className={pill(hasCondition(draft.conditions, "signedInOnly"))} onClick={() => withCondition("signedInOnly", hasCondition(draft.conditions, "signedInOnly") ? null : { type: "signedInOnly" })}>
            Signed-in clients
          </button>
          <button type="button" className={pill(hasCondition(draft.conditions, "firstOrderOnly"))} onClick={() => withCondition("firstOrderOnly", hasCondition(draft.conditions, "firstOrderOnly") ? null : { type: "firstOrderOnly" })}>
            First order only
          </button>
        </div>
      </div>

      <div className={field}>
        <Label>Paid by</Label>
        <div className={chipRow}>
          {PAYMENTS.map((p) => {
            const on = payments.includes(p.key);
            return (
              <button key={p.key} type="button" className={pill(on)} aria-pressed={on} onClick={() => {
                const next = on ? payments.filter((x) => x !== p.key) : [...payments, p.key];
                withCondition("paymentMethods", next.length ? { type: "paymentMethods", methods: next } : null);
              }}>
                {p.label}
              </button>
            );
          })}
        </div>
        <p className={hint}>None chosen means any way of paying.</p>
      </div>

      <div className={grid3}>
        <div className={field}>
          <Label htmlFor="usage-limit">Total uses</Label>
          <CountInput id="usage-limit" value={draft.usageLimit} onChange={(v) => set({ usageLimit: v })} placeholder="Unlimited" />
        </div>
        <div className={field}>
          <Label htmlFor="per-client">Uses per client</Label>
          <CountInput id="per-client" value={draft.perCustomerLimit} onChange={(v) => set({ perCustomerLimit: v })} placeholder="Unlimited" />
        </div>
        <div className={field}>
          <Label htmlFor="max-off">Most off one order</Label>
          <MoneyInput id="max-off" value={draft.maxDiscountCents} onChange={(v) => set({ maxDiscountCents: v })} placeholder="No cap" />
        </div>
      </div>
      <div className={field}>
        <Label htmlFor="budget">Stop once this much has been given away</Label>
        <MoneyInput id="budget" value={draft.budgetCents} onChange={(v) => set({ budgetCents: v })} placeholder="No budget" />
      </div>
    </>
  );
}

/** What the client sees. Every field is optional and hidden when empty. */
export function MessageFields({ draft, set, headline }: { draft: Draft; set: (patch: DraftPatch) => void; headline: string }) {
  const text = (key: keyof Draft) => (draft[key] as string | null) ?? "";
  return (
    <>
      <div className={grid2}>
        <div className={field}>
          <Label htmlFor="msg-title">Offer title</Label>
          <Input id="msg-title" value={text("title")} placeholder={headline} onChange={(e) => set({ title: e.target.value || null })} />
        </div>
        <div className={field}>
          <Label htmlFor="msg-badge">Badge on pieces</Label>
          <Input id="msg-badge" value={text("badge")} placeholder="3 for ₹999" onChange={(e) => set({ badge: e.target.value || null })} />
        </div>
      </div>
      <div className={field}>
        <Label htmlFor="msg-nudge">Nudge in the cart</Label>
        <Input id="msg-nudge" value={text("nudgeText")} placeholder={`Add {remaining} to get ${headline}`} onChange={(e) => set({ nudgeText: e.target.value || null })} />
        <p className={hint}>{"{remaining}"} becomes “1 more piece” or “₹500 more”.</p>
      </div>
      <div className={field}>
        <Label htmlFor="msg-applied">When it applies</Label>
        <Input id="msg-applied" value={text("appliedText")} placeholder={`${headline} · you save {saving}`} onChange={(e) => set({ appliedText: e.target.value || null })} />
      </div>
      <div className={grid2}>
        <div className={field}>
          <Label htmlFor="msg-invoice">On the invoice</Label>
          <Input id="msg-invoice" value={text("invoiceLabel")} placeholder={`Offer: ${headline}`} onChange={(e) => set({ invoiceLabel: e.target.value || null })} />
        </div>
        <div className={field}>
          <Label htmlFor="msg-slug">Offer page address</Label>
          <Input id="msg-slug" value={text("slug")} placeholder="diwali-trio" onChange={(e) => set({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") || null })} />
        </div>
      </div>
      <div className={field}>
        <Label htmlFor="msg-terms">Terms</Label>
        <Textarea id="msg-terms" rows={2} value={text("terms")} onChange={(e) => set({ terms: e.target.value || null })} />
      </div>
      <div className={toggleRow}>
        <div>
          <Label htmlFor="msg-show">Show in the storefront&rsquo;s offers</Label>
          <p className={hint}>Switch off for private codes you hand out yourself.</p>
        </div>
        <Switch id="msg-show" checked={draft.showOnStorefront} onCheckedChange={(v) => set({ showOnStorefront: v })} />
      </div>
    </>
  );
}
