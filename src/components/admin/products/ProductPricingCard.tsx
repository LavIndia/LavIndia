"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProductFormData } from "@/components/admin/products/product-form-types";
import {
  fieldGrid3Style,
  fieldStyle,
  requiredMarkStyle,
} from "@/components/admin/products/product-form.styles";
import { css } from "styled-system/css";

/**
 * The base price and the compare-at price.
 *
 * Every variant inherits the base price unless it sets its own in the
 * variants table below; the compare-at price is what the storefront strikes
 * through. Stock is not priced here or anywhere in this form — it belongs to
 * Inventory, per variant and per location.
 */

const cardContentStyle = css({ display: "flex", flexDirection: "column", gap: "4" });
const noteStyle = css({ fontSize: "sm", color: "fg.muted", lineHeight: "1.6" });
const savingsStyle = css({ fontSize: "sm", color: "success", fontWeight: "medium" });
const linkStyle = css({ color: "accent.pressed", textDecoration: "underline", textUnderlineOffset: "3px" });

function savings(price: string, compareAt: string): string | null {
  const p = parseFloat(price);
  const c = parseFloat(compareAt);
  if (!Number.isFinite(p) || !Number.isFinite(c) || c <= p || p <= 0) return null;
  const off = Math.round(((c - p) / c) * 100);
  return `Customers save ₹${(c - p).toLocaleString("en-IN")} (${off}% off)`;
}

/**
 * Gross margin on the piece, shown the moment both numbers are known.
 *
 * Put next to the field rather than on a report because this is where the
 * decision is made: the person typing the selling price is the one who needs
 * to see what it leaves.
 */
function marginNote(price: string, cost: string): string | null {
  const p = parseFloat(price);
  const c = parseFloat(cost);
  if (!Number.isFinite(p) || !Number.isFinite(c) || p <= 0 || c <= 0) return null;
  const profit = p - c;
  const pct = Math.round((profit / p) * 100);
  return profit >= 0
    ? `Margin ₹${profit.toLocaleString("en-IN")} (${pct}%)`
    : `Sold below cost by ₹${Math.abs(profit).toLocaleString("en-IN")}`;
}

export interface ProductPricingCardProps {
  formData: ProductFormData;
  onChange: (field: string, value: string | boolean) => void;
}

export function ProductPricingCard({ formData, onChange }: ProductPricingCardProps) {
  const saving = savings(formData.price, formData.compareAtPrice);
  const margin = marginNote(formData.price, formData.costPrice);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pricing</CardTitle>
        <CardDescription>
          The price every variant starts from. A variant can set its own price
          in the table below.
        </CardDescription>
      </CardHeader>
      <CardContent className={cardContentStyle}>
        <div className={fieldGrid3Style}>
          <div className={fieldStyle}>
            <Label htmlFor="price">
              Price (₹)<span className={requiredMarkStyle}>*</span>
            </Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="0"
              value={formData.price}
              onChange={(e) => onChange("price", e.target.value)}
              required
            />
          </div>

          <div className={fieldStyle}>
            <Label htmlFor="compareAtPrice">Compare-at price (₹)</Label>
            <Input
              id="compareAtPrice"
              type="number"
              step="0.01"
              min="0"
              value={formData.compareAtPrice}
              onChange={(e) => onChange("compareAtPrice", e.target.value)}
            />
            {/* Only when there is something to say: a "0% off" line would be noise. */}
            {saving ? <p className={savingsStyle}>{saving}</p> : null}
          </div>

          <div className={fieldStyle}>
            <Label htmlFor="costPrice">Cost price (₹)</Label>
            <Input
              id="costPrice"
              type="number"
              step="0.01"
              min="0"
              value={formData.costPrice}
              onChange={(e) => onChange("costPrice", e.target.value)}
            />
            <p className={noteStyle}>
              What the piece costs you. Never shown to a customer; it is what margin is
              worked out from.
            </p>
            {margin ? <p className={savingsStyle}>{margin}</p> : null}
          </div>

          <div className={fieldStyle}>
            <Label>Stock</Label>
            <p className={noteStyle}>
              Held in{" "}
              <Link href="/admin/inventory/receive" className={linkStyle}>
                Inventory
              </Link>
              , per variant. Each variant&rsquo;s on-hand count is shown in the
              table below.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
