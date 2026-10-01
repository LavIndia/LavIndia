"use client";

import { css } from "styled-system/css";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InfoHint } from "@/components/ui/info-hint";
import { tierThresholdProblem, tierThresholdsFrom } from "@/modules/customers/customer-tier";

const cardBody = css({ display: "flex", flexDirection: "column", gap: "4" });
const grid = css({ display: "grid", gridTemplateColumns: { base: "1fr", sm: "repeat(3, 1fr)" }, gap: "4" });
const fieldStyle = css({ display: "flex", flexDirection: "column", gap: "2", minWidth: 0 });
const inputRowStyle = css({ display: "flex", alignItems: "center", gap: "2" });
const prefixStyle = css({ fontSize: "sm", color: "fg.muted" });
const hintStyle = css({ fontSize: "xs", color: "fg.muted", lineHeight: "relaxed" });
const problemStyle = css({ fontSize: "sm", color: "danger", fontWeight: "medium" });

export interface ClientTierValues {
  tierVipCents: number;
  tierGoldCents: number;
  tierSilverCents: number;
}

const FIELDS = [
  { field: "tierVipCents", id: "tierVip", label: "VIP from" },
  { field: "tierGoldCents", id: "tierGold", label: "Gold from" },
  { field: "tierSilverCents", id: "tierSilver", label: "Silver from" },
] as const;

/**
 * The lifetime spend at which a client becomes Silver, Gold and VIP on the
 * Customers screen and in its export.
 *
 * Entered in whole rupees and stored in paise, like every other amount. A
 * client below Silver is Regular. The order is checked here as it is typed
 * and again by the server, so a tier can never be left empty.
 */
export function ClientTiersSection({
  values,
  onChange,
}: {
  values: ClientTierValues;
  onChange: <K extends keyof ClientTierValues>(field: K, value: ClientTierValues[K]) => void;
}) {
  const problem = tierThresholdProblem(tierThresholdsFrom(values));

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Client tiers
          <InfoHint label="How tiers are decided" below>
            A client&rsquo;s tier is what they have actually paid across the website and the
            counter, less anything cancelled or refunded. A change here re-tiers every client at
            once; nothing is stored against the client.
          </InfoHint>
        </CardTitle>
        <CardDescription>The lifetime spend at which a client enters each tier.</CardDescription>
      </CardHeader>
      <CardContent className={cardBody}>
        <div className={grid}>
          {FIELDS.map(({ field, id, label }) => {
            const rupees = values[field] / 100;
            return (
              <div key={field} className={fieldStyle}>
                <Label htmlFor={id}>{label}</Label>
                <span className={inputRowStyle}>
                  <span className={prefixStyle}>₹</span>
                  <Input
                    id={id}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    step={1}
                    value={Number.isFinite(rupees) ? rupees : 0}
                    aria-invalid={problem ? true : undefined}
                    onChange={(event) =>
                      onChange(field, Math.max(0, Math.round(Number(event.target.value))) * 100 || 0)
                    }
                  />
                </span>
              </div>
            );
          })}
        </div>
        {problem ? (
          <p className={problemStyle} role="alert">
            {problem}
          </p>
        ) : (
          <span className={hintStyle}>Below Silver, a client is Regular.</span>
        )}
      </CardContent>
    </Card>
  );
}
