"use client";

import { Plus, Wand2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OptionChipInput } from "@/components/admin/products/OptionChipInput";
import {
  OPTION_DIMENSIONS,
  type CuratedValue,
  type OptionDimension,
} from "@/components/admin/products/product-form-types";
import { fieldGrid3Style } from "@/components/admin/products/product-form.styles";
import { css } from "styled-system/css";

/**
 * The option values a product comes in — Colour, Size, Material.
 *
 * Defining the options is a different job from managing the variants they
 * produce, so it gets its own card: values are picked from the curated lists
 * an admin already maintains for the shop's filters (or typed), and one
 * press generates every combination as a variant in the table below.
 */

const cardContentStyle = css({ display: "flex", flexDirection: "column", gap: "5" });
const actionsStyle = css({ display: "flex", flexWrap: "wrap", gap: "2" });

export interface ProductOptionsCardProps {
  optionValues: Record<OptionDimension, string[]>;
  curatedOptions: Record<OptionDimension, CuratedValue[]>;
  onAddOptionValue: (dim: OptionDimension, value: string) => void;
  onRemoveOptionValue: (dim: OptionDimension, value: string) => void;
  onGenerateVariants: () => void;
  onAddBlankVariant: () => void;
}

export function ProductOptionsCard({
  optionValues,
  curatedOptions,
  onAddOptionValue,
  onRemoveOptionValue,
  onGenerateVariants,
  onAddBlankVariant,
}: ProductOptionsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Options</CardTitle>
        <CardDescription>
          The Colour, Size or Material values this product comes in. Generate
          turns every combination into a variant; leave all three empty for a
          product sold as a single item.
        </CardDescription>
      </CardHeader>
      <CardContent className={cardContentStyle}>
        <div className={fieldGrid3Style}>
          {OPTION_DIMENSIONS.map((dim) => (
            <OptionChipInput
              key={dim.key}
              label={dim.label}
              placeholder={dim.placeholder}
              values={optionValues[dim.key]}
              curatedValues={curatedOptions[dim.key]}
              onAdd={(value) => onAddOptionValue(dim.key, value)}
              onRemove={(value) => onRemoveOptionValue(dim.key, value)}
            />
          ))}
        </div>

        <div className={actionsStyle}>
          <Button type="button" variant="outline" onClick={onGenerateVariants}>
            <Wand2 className={css({ height: "4", width: "4" })} />
            Generate variants
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onAddBlankVariant}>
            <Plus className={css({ height: "3.5", width: "3.5" })} />
            Add a one-off variant
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
