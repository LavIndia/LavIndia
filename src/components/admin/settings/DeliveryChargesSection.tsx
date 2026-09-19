"use client";

import { css } from "styled-system/css";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InfoHint } from "@/components/ui/info-hint";

const cardBody = css({ display: "flex", flexDirection: "column", gap: "4" });
const fieldStyle = css({ display: "flex", flexDirection: "column", gap: "2" });
const inputRowStyle = css({ display: "flex", alignItems: "center", gap: "2", maxWidth: "16rem" });
const prefixStyle = css({ fontSize: "sm", color: "fg.muted" });
const hintStyle = css({ fontSize: "xs", color: "fg.muted", lineHeight: "relaxed" });

/**
 * What the shop charges for taking payment on the doorstep.
 *
 * Entered in rupees because that is how the owner thinks about a price, and
 * stored in paise because that is how every other amount in the system is
 * held — converting once here keeps the rounding out of the checkout
 * arithmetic.
 */
export function DeliveryChargesSection({
  codFeeCents,
  onChange,
}: {
  codFeeCents: number;
  onChange: (codFeeCents: number) => void;
}) {
  const rupees = codFeeCents / 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Delivery charges
          <InfoHint label="About the cash on delivery fee" below>
            Cash on delivery costs the shop money — the courier is paid to
            collect, and the cash has to be banked. This is what the customer
            is charged to cover it. Leave it at zero to offer cash on delivery
            free.
          </InfoHint>
        </CardTitle>
        <CardDescription>
          Added to an order at checkout when the customer chooses to pay cash.
        </CardDescription>
      </CardHeader>
      <CardContent className={cardBody}>
        <div className={fieldStyle}>
          <Label htmlFor="codFee">Cash on delivery fee</Label>
          <span className={inputRowStyle}>
            <span className={prefixStyle}>₹</span>
            <Input
              id="codFee"
              type="number"
              min={0}
              step={1}
              value={Number.isFinite(rupees) ? rupees : 0}
              onChange={(event) => {
                const next = Math.max(0, Math.round(Number(event.target.value) * 100) || 0);
                onChange(next);
              }}
              aria-label="Cash on delivery fee in rupees"
            />
          </span>
          <span className={hintStyle}>
            {codFeeCents === 0
              ? "Cash on delivery is currently free for the customer."
              : `Customers paying cash will be charged ₹${rupees.toLocaleString("en-IN")} on top of their order.`}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
