"use client";

import { css } from "styled-system/css";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Where else the shop's pieces can be bought.
 *
 * A separate card from Social Media because these are sales channels rather
 * than places to follow the brand, and the footer treats them differently.
 */

const cardBody = css({ display: "flex", flexDirection: "column", gap: "4" });
const fieldStyle = css({ display: "flex", flexDirection: "column", gap: "2" });

/** Adding a marketplace is a line here rather than another block of markup. */
const MARKETPLACES = [
  { key: "amazonLink", label: "Amazon Store", placeholder: "https://amazon.in/..." },
  { key: "flipkartLink", label: "Flipkart Store", placeholder: "https://flipkart.com/..." },
  { key: "myntraLink", label: "Myntra Store", placeholder: "https://myntra.com/..." },
  { key: "blinkitLink", label: "Blinkit Store", placeholder: "https://blinkit.com/..." },
  { key: "zeptoLink", label: "Zepto Store", placeholder: "https://zeptonow.com/..." },
] as const;

export type MarketplaceField = (typeof MARKETPLACES)[number]["key"];

export function MarketplaceLinksSection({
  values,
  onChange,
}: {
  values: Record<MarketplaceField, string | null>;
  onChange: (field: MarketplaceField, value: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Marketplace Links</CardTitle>
        <CardDescription>Links to your products on other platforms</CardDescription>
      </CardHeader>
      <CardContent className={cardBody}>
        {MARKETPLACES.map((marketplace) => (
          <div key={marketplace.key} className={fieldStyle}>
            <Label htmlFor={marketplace.key}>{marketplace.label}</Label>
            <Input
              id={marketplace.key}
              value={values[marketplace.key] || ""}
              onChange={(event) => onChange(marketplace.key, event.target.value)}
              placeholder={marketplace.placeholder}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
