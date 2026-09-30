"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { css } from "styled-system/css";
import type { Benefit, RewardValue } from "@/modules/promotions/contracts";
import { chipRow, hint, inlineMoney, inlineNumber, pill, sentence } from "./editor.styles";
import { CountInput, MoneyInput } from "./MoneyInput";
import { PiecesChooser } from "./PiecesChooser";
import { OrderTierEditor, PercentTierEditor, SetTierEditor } from "./TierEditors";

interface Props {
  benefit: Benefit;
  onChange: (b: Benefit) => void;
  maxApplications: number | null;
  onMaxApplications: (n: number | null) => void;
}

const block = css({ display: "flex", flexDirection: "column", gap: "4" });
const part = css({ display: "flex", flexDirection: "column", gap: "3", borderRadius: "lg", border: "1px solid", borderColor: "border.subtle", padding: "3" });
const icon = css({ width: "4", height: "4" });
const pct = (bps: number) => Math.round(bps / 100);

function Repeat({ value, onChange }: { value: number | null; onChange: (n: number | null) => void }) {
  return (
    <div className={sentence}>
      <span>Apply</span>
      <div className={chipRow}>
        <button type="button" className={pill(value === null)} aria-pressed={value === null} onClick={() => onChange(null)}>as many times as possible</button>
        <button type="button" className={pill(value === 1)} aria-pressed={value === 1} onClick={() => onChange(1)}>once per order</button>
        <button type="button" className={pill(value !== null && value > 1)} aria-pressed={value !== null && value > 1} onClick={() => onChange(2)}>up to…</button>
      </div>
      {value !== null && value > 1 && <CountInput id="max-apps" ariaLabel="Times per order" className={inlineNumber} value={value} min={2} onChange={onChange} />}
    </div>
  );
}

function RewardValueEditor({ value, onChange }: { value: RewardValue; onChange: (v: RewardValue) => void }) {
  const free = value.type === "percent" && value.bps >= 10_000;
  return (
    <div className={sentence}>
      <span>at</span>
      <div className={chipRow}>
        <button type="button" className={pill(free)} aria-pressed={free} onClick={() => onChange({ type: "percent", bps: 10_000 })}>Free</button>
        <button type="button" className={pill(value.type === "percent" && !free)} aria-pressed={value.type === "percent" && !free} onClick={() => onChange({ type: "percent", bps: 5_000 })}>% off</button>
        <button type="button" className={pill(value.type === "amountOff")} aria-pressed={value.type === "amountOff"} onClick={() => onChange({ type: "amountOff", cents: 20_000 })}>₹ off</button>
        <button type="button" className={pill(value.type === "fixedPrice")} aria-pressed={value.type === "fixedPrice"} onClick={() => onChange({ type: "fixedPrice", cents: 49_900 })}>for ₹</button>
      </div>
      {value.type === "percent" && !free && (
        <><CountInput id="reward-pct" ariaLabel="Percent off" className={inlineNumber} value={pct(value.bps)} onChange={(v) => onChange({ type: "percent", bps: Math.min(10_000, (v ?? 0) * 100) })} /><span>%</span></>
      )}
      {value.type === "amountOff" && <MoneyInput id="reward-off" ariaLabel="Amount off" className={inlineMoney} value={value.cents} onChange={(v) => onChange({ type: "amountOff", cents: v ?? 0 })} />}
      {value.type === "fixedPrice" && <MoneyInput id="reward-price" ariaLabel="Reward price" className={inlineMoney} value={value.cents} onChange={(v) => onChange({ type: "fixedPrice", cents: v ?? 0 })} />}
    </div>
  );
}

/** What the client gets, written as the sentence it means. */
export function BenefitEditor({ benefit, onChange, maxApplications, onMaxApplications }: Props) {
  switch (benefit.type) {
    case "setPrice":
      return (
        <div className={block}>
          <div className={sentence}>
            <span>Any</span>
            <CountInput id="set-size" ariaLabel="Pieces in the set" className={inlineNumber} value={benefit.setSize} onChange={(v) => onChange({ ...benefit, setSize: v ?? 1 })} />
            <span>of these pieces for</span>
            <MoneyInput id="set-price" ariaLabel="Set price" className={inlineMoney} value={benefit.priceCents} onChange={(v) => onChange({ ...benefit, priceCents: v ?? 0 })} />
          </div>
          <Repeat value={maxApplications} onChange={onMaxApplications} />
        </div>
      );
    case "setPriceTiers":
      return (
        <div className={block}>
          <SetTierEditor tiers={benefit.tiers} onChange={(tiers) => onChange({ ...benefit, tiers })} />
          <div className={sentence}>
            <span>Pieces beyond the largest set:</span>
            <button type="button" className={pill(benefit.leftovers === "NEW_SET")} aria-pressed={benefit.leftovers === "NEW_SET"} onClick={() => onChange({ ...benefit, leftovers: "NEW_SET" })}>start another set</button>
            <button type="button" className={pill(benefit.leftovers === "FULL_PRICE")} aria-pressed={benefit.leftovers === "FULL_PRICE"} onClick={() => onChange({ ...benefit, leftovers: "FULL_PRICE" })}>pay full price</button>
          </div>
          <p className={hint}>The client always gets the combination of sets that costs them least.</p>
        </div>
      );
    case "reward":
      return (
        <div className={block}>
          <div className={sentence}>
            <span>Buy</span>
            <CountInput id="buy-qty" ariaLabel="Buy quantity" className={inlineNumber} value={benefit.buyQuantity} onChange={(v) => onChange({ ...benefit, buyQuantity: v ?? 1 })} />
            <span>, get</span>
            <CountInput id="get-qty" ariaLabel="Get quantity" className={inlineNumber} value={benefit.getQuantity} onChange={(v) => onChange({ ...benefit, getQuantity: v ?? 1 })} />
          </div>
          <RewardValueEditor value={benefit.value} onChange={(value) => onChange({ ...benefit, value })} />
          <div className={sentence}>
            <span>The one they get is the</span>
            <button type="button" className={pill(benefit.pick === "CHEAPEST")} aria-pressed={benefit.pick === "CHEAPEST"} onClick={() => onChange({ ...benefit, pick: "CHEAPEST" })}>lowest-priced</button>
            <button type="button" className={pill(benefit.pick === "MOST_EXPENSIVE")} aria-pressed={benefit.pick === "MOST_EXPENSIVE"} onClick={() => onChange({ ...benefit, pick: "MOST_EXPENSIVE" })}>highest-priced</button>
          </div>
          <div className={sentence}>
            <span>It comes from</span>
            <button type="button" className={pill(benefit.gets === null)} aria-pressed={benefit.gets === null} onClick={() => onChange({ ...benefit, gets: null })}>the same pieces</button>
            <button type="button" className={pill(benefit.gets !== null)} aria-pressed={benefit.gets !== null} onClick={() => onChange({ ...benefit, gets: benefit.gets ?? { include: [], exclude: [] } })}>other pieces</button>
          </div>
          {benefit.gets && (
            <div className={part}>
              <span className={hint}>Pieces the client can get</span>
              <PiecesChooser id="gets" value={benefit.gets} allowAll={false} onChange={(gets) => onChange({ ...benefit, gets })} />
            </div>
          )}
          <Repeat value={maxApplications} onChange={onMaxApplications} />
          <p className={hint}>The reward piece is never added for the client — they are prompted to add it.</p>
        </div>
      );
    case "bundle":
      return (
        <div className={block}>
          {benefit.components.map((component, i) => (
            <div key={i} className={part}>
              <div className={sentence}>
                <span>Part {i + 1}:</span>
                <CountInput id={`bundle-qty-${i}`} ariaLabel="Quantity" className={inlineNumber} value={component.quantity} onChange={(v) => onChange({ ...benefit, components: benefit.components.map((c, j) => (j === i ? { ...c, quantity: v ?? 1 } : c)) })} />
                <span>piece(s) from</span>
                <Button type="button" variant="ghost" size="icon" aria-label="Remove part" disabled={benefit.components.length <= 2} onClick={() => onChange({ ...benefit, components: benefit.components.filter((_, j) => j !== i) })}>
                  <Trash2 className={icon} />
                </Button>
              </div>
              <PiecesChooser id={`bundle-${i}`} value={component.pieces} allowAll={false} onChange={(pieces) => onChange({ ...benefit, components: benefit.components.map((c, j) => (j === i ? { ...c, pieces } : c)) })} />
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => onChange({ ...benefit, components: [...benefit.components, { pieces: { include: [], exclude: [] }, quantity: 1 }] })}>
            <Plus className={icon} /> Add a part
          </Button>
          <div className={sentence}>
            <span>Together for</span>
            <MoneyInput id="bundle-price" ariaLabel="Bundle price" className={inlineMoney} value={benefit.priceCents} onChange={(v) => onChange({ ...benefit, priceCents: v ?? 0 })} />
          </div>
          <Repeat value={maxApplications} onChange={onMaxApplications} />
        </div>
      );
    case "percentOff":
    case "percentOffOrder":
    case "amountOffOrder": {
      const isOrder = benefit.type !== "percentOff";
      return (
        <div className={block}>
          {isOrder && (
            <div className={chipRow}>
              <button type="button" className={pill(benefit.type === "percentOffOrder")} aria-pressed={benefit.type === "percentOffOrder"} onClick={() => onChange({ type: "percentOffOrder", bps: 1_000 })}>% off the order</button>
              <button type="button" className={pill(benefit.type === "amountOffOrder")} aria-pressed={benefit.type === "amountOffOrder"} onClick={() => onChange({ type: "amountOffOrder", cents: 50_000 })}>₹ off the order</button>
            </div>
          )}
          <div className={sentence}>
            {benefit.type === "amountOffOrder" ? (
              <><MoneyInput id="order-off" ariaLabel="Amount off" className={inlineMoney} value={benefit.cents} onChange={(v) => onChange({ type: "amountOffOrder", cents: v ?? 0 })} /><span>off the order</span></>
            ) : (
              <><CountInput id="pct-off" ariaLabel="Percent off" className={inlineNumber} value={pct(benefit.bps)} onChange={(v) => onChange({ ...benefit, bps: Math.min(10_000, (v ?? 0) * 100) } as Benefit)} /><span>% off {isOrder ? "the order" : "each of these pieces"}</span></>
            )}
          </div>
        </div>
      );
    }
    case "amountOffEach":
      return (
        <div className={sentence}>
          <MoneyInput id="each-off" ariaLabel="Amount off" className={inlineMoney} value={benefit.cents} onChange={(v) => onChange({ ...benefit, cents: v ?? 0 })} />
          <span>off each of these pieces</span>
        </div>
      );
    case "fixedPriceEach":
      return (
        <div className={block}>
          <div className={sentence}>
            <span>Each of these pieces for</span>
            <MoneyInput id="each-price" ariaLabel="Price each" className={inlineMoney} value={benefit.cents} onChange={(v) => onChange({ ...benefit, cents: v ?? 0 })} />
          </div>
        </div>
      );
    case "percentTiers":
      return (
        <div className={block}>
          <div className={chipRow}>
            <button type="button" className={pill(benefit.basis === "QUANTITY")} aria-pressed={benefit.basis === "QUANTITY"} onClick={() => onChange({ ...benefit, basis: "QUANTITY", tiers: [{ min: 2, bps: 1_000 }, { min: 3, bps: 1_500 }] })}>By number of pieces</button>
            <button type="button" className={pill(benefit.basis === "SUBTOTAL")} aria-pressed={benefit.basis === "SUBTOTAL"} onClick={() => onChange({ ...benefit, basis: "SUBTOTAL", tiers: [{ min: 3_00_000, bps: 1_000 }, { min: 5_00_000, bps: 1_500 }] })}>By amount spent on them</button>
          </div>
          <PercentTierEditor basis={benefit.basis} tiers={benefit.tiers} onChange={(tiers) => onChange({ ...benefit, tiers })} />
        </div>
      );
    case "orderTiers":
      return <OrderTierEditor tiers={benefit.tiers} onChange={(tiers) => onChange({ ...benefit, tiers })} />;
    case "freeDelivery":
      return <p className={hint}>Delivery is free. Set a minimum spend under Limits if it should only apply above one.</p>;
  }
}
