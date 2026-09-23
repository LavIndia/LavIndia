"use client";

import { css } from "styled-system/css";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * The reassurances shown to a shopper: how many have bought, how they rated
 * it, when someone can be reached, and whether cash on delivery is offered.
 *
 * These are claims made to customers, so they are settings rather than
 * constants in the markup — a figure that cannot be corrected without a
 * deploy is a figure that ends up wrong.
 */

const cardBody = css({ display: "flex", flexDirection: "column", gap: "4" });
const fieldStyle = css({ display: "flex", flexDirection: "column", gap: "2" });
const fieldRow = css({
  display: "grid",
  gap: "4",
  gridTemplateColumns: { base: "1fr", md: "repeat(2, 1fr)" },
});
const switchRow = css({ display: "flex", alignItems: "center", gap: "3" });

export interface TrustBadgeValues {
  codAvailable: boolean;
  customerCount: string;
  rating: string;
  supportHoursStart: string | null;
  supportHoursEnd: string | null;
}

export function TrustBadgesSection({
  values,
  onChange,
}: {
  values: TrustBadgeValues;
  onChange: <K extends keyof TrustBadgeValues>(
    field: K,
    value: TrustBadgeValues[K],
  ) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Trust Badges</CardTitle>
        <CardDescription>
          Configure trust indicators displayed on the website
        </CardDescription>
      </CardHeader>
      <CardContent className={cardBody}>
        <div className={switchRow}>
          <Switch
            id="codAvailable"
            checked={values.codAvailable}
            onCheckedChange={(checked) => onChange("codAvailable", checked)}
          />
          <Label htmlFor="codAvailable">Cash on Delivery Available</Label>
        </div>

        <div className={fieldStyle}>
          <Label htmlFor="customerCount">Total Customers</Label>
          <Input
            id="customerCount"
            type="text"
            value={values.customerCount}
            onChange={(event) => onChange("customerCount", event.target.value)}
            placeholder="9L+"
          />
        </div>

        <div className={fieldStyle}>
          <Label htmlFor="rating">Customer Rating (out of 5)</Label>
          <Input
            id="rating"
            type="text"
            value={values.rating}
            onChange={(event) => onChange("rating", event.target.value)}
            placeholder="4.8"
          />
        </div>

        <div className={fieldRow}>
          <div className={fieldStyle}>
            <Label htmlFor="supportHoursStart">Support Start Time</Label>
            <Input
              id="supportHoursStart"
              type="time"
              value={values.supportHoursStart || ""}
              onChange={(event) => onChange("supportHoursStart", event.target.value)}
            />
          </div>

          <div className={fieldStyle}>
            <Label htmlFor="supportHoursEnd">Support End Time</Label>
            <Input
              id="supportHoursEnd"
              type="time"
              value={values.supportHoursEnd || ""}
              onChange={(event) => onChange("supportHoursEnd", event.target.value)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
