"use client";

import { css } from "styled-system/css";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { InfoHint } from "@/components/ui/info-hint";

const cardBody = css({ display: "flex", flexDirection: "column", gap: "5" });
const fieldStyle = css({ display: "flex", flexDirection: "column", gap: "2" });
const grid = css({ display: "grid", gridTemplateColumns: { base: "1fr", sm: "repeat(3, 1fr)" }, gap: "4" });
const inputRowStyle = css({ display: "flex", alignItems: "center", gap: "2", maxWidth: "16rem" });
const prefixStyle = css({ fontSize: "sm", color: "fg.muted" });
const hintStyle = css({ fontSize: "xs", color: "fg.muted", lineHeight: "relaxed" });
const toggleRow = css({ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "4", borderRadius: "lg", border: "1px solid", borderColor: "border.subtle", padding: "3" });

export interface DeliveryChargeValues {
  codFeeCents: number;
  standardShippingCents: number;
  expressShippingCents: number;
  onlinePricesIncludeGst: boolean;
  storePricesIncludeGst: boolean;
}

function RupeeField({ id, label, cents, onChange }: { id: string; label: string; cents: number; onChange: (c: number) => void }) {
  const rupees = cents / 100;
  return (
    <div className={fieldStyle}>
      <Label htmlFor={id}>{label}</Label>
      <span className={inputRowStyle}>
        <span className={prefixStyle}>₹</span>
        <Input
          id={id}
          type="number"
          min={0}
          step={1}
          value={Number.isFinite(rupees) ? rupees : 0}
          onChange={(event) => onChange(Math.max(0, Math.round(Number(event.target.value) * 100) || 0))}
        />
      </span>
    </div>
  );
}

/**
 * What the shop charges beyond its pieces, and how GST sits in its prices.
 *
 * Entered in rupees because that is how the owner thinks about a price, and
 * stored in paise like every other amount. Free delivery above a spend is an
 * offer (Admin → Offers → Free delivery), not a setting, so it can be
 * scheduled and switched off like any other.
 */
export function DeliveryChargesSection({
  values,
  onChange,
}: {
  values: DeliveryChargeValues;
  onChange: <K extends keyof DeliveryChargeValues>(field: K, value: DeliveryChargeValues[K]) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Delivery charges and GST
          <InfoHint label="About these charges" below>
            Cash on delivery costs the shop money — the courier is paid to collect, and the cash
            has to be banked. Leave any charge at zero to make it free.
          </InfoHint>
        </CardTitle>
        <CardDescription>What checkout adds to an order, and how GST is worked out.</CardDescription>
      </CardHeader>
      <CardContent className={cardBody}>
        <div className={grid}>
          <RupeeField id="standardShipping" label="Standard delivery" cents={values.standardShippingCents} onChange={(c) => onChange("standardShippingCents", c)} />
          <RupeeField id="expressShipping" label="Express delivery" cents={values.expressShippingCents} onChange={(c) => onChange("expressShippingCents", c)} />
          <RupeeField id="codFee" label="Cash on delivery fee" cents={values.codFeeCents} onChange={(c) => onChange("codFeeCents", c)} />
        </div>
        <span className={hintStyle}>
          For free delivery above a spend, create a Free delivery offer in Offers.
        </span>

        <div className={toggleRow}>
          <div>
            <Label htmlFor="onlineGst">Website prices include GST</Label>
            <p className={hintStyle}>On: the client pays the price shown and the invoice shows the GST inside it. Off: GST is added at checkout.</p>
          </div>
          <Switch id="onlineGst" checked={values.onlinePricesIncludeGst} onCheckedChange={(v) => onChange("onlinePricesIncludeGst", v)} />
        </div>
        <div className={toggleRow}>
          <div>
            <Label htmlFor="storeGst">Counter prices include GST</Label>
            <p className={hintStyle}>On: the tag price is what the client pays. Off: GST is added to the bill.</p>
          </div>
          <Switch id="storeGst" checked={values.storePricesIncludeGst} onCheckedChange={(v) => onChange("storePricesIncludeGst", v)} />
        </div>
      </CardContent>
    </Card>
  );
}
