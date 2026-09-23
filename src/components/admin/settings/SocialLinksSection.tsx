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
 * Where the shop can be found elsewhere.
 *
 * Lifted out of the settings form for the same reason Delivery charges and
 * Logo were: the form itself should read as a list of sections, not as one
 * long sheet of inputs nobody can find their place in.
 */

const cardBody = css({ display: "flex", flexDirection: "column", gap: "4" });
const fieldRow = css({
  display: "grid",
  gap: "4",
  gridTemplateColumns: { base: "1fr", md: "repeat(2, 1fr)" },
});
const fieldStyle = css({ display: "flex", flexDirection: "column", gap: "2" });

/** The networks offered, so adding one is a line here rather than a new card. */
const NETWORKS = [
  { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/lavishindia" },
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/lavishindia" },
  { key: "twitter", label: "Twitter", placeholder: "https://twitter.com/lavishindia" },
  {
    key: "linkedin",
    label: "LinkedIn",
    placeholder: "https://linkedin.com/company/lavishindia",
  },
] as const;

export type SocialNetwork = (typeof NETWORKS)[number]["key"];

export function SocialLinksSection({
  values,
  onChange,
}: {
  values: Record<SocialNetwork, string | null>;
  onChange: (field: SocialNetwork, value: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Social Media Links</CardTitle>
        <CardDescription>Your social media presence</CardDescription>
      </CardHeader>
      <CardContent className={cardBody}>
        <div className={fieldRow}>
          {NETWORKS.map((network) => (
            <div key={network.key} className={fieldStyle}>
              <Label htmlFor={network.key}>{network.label}</Label>
              <Input
                id={network.key}
                value={values[network.key] || ""}
                onChange={(event) => onChange(network.key, event.target.value)}
                placeholder={network.placeholder}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
