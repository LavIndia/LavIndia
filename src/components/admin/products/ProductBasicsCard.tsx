"use client";

import { useId, useState } from "react";
import { Link2, PencilLine } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  CuratedValue,
  ProductFormData,
} from "@/components/admin/products/product-form-types";
import {
  fieldGrid3Style,
  fieldStyle,
  requiredMarkStyle,
} from "@/components/admin/products/product-form.styles";
import { css } from "styled-system/css";

/**
 * What the product is: its name, where it sits in the catalog, how it is
 * described, and the address it is sold at.
 *
 * The slug is the last part of the product's URL, so it is shown as that —
 * a preview of the address, with the handle editable on request — rather
 * than as a bare required field an admin has to know the meaning of. No SKU
 * here: a SKU identifies a sellable variant, and every variant carries its
 * own.
 */

const cardContentStyle = css({ display: "flex", flexDirection: "column", gap: "4" });
const wideFieldStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "2",
  sm: { gridColumn: "span 2" },
});
const urlRowStyle = css({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "2",
  fontSize: "sm",
  color: "fg.muted",
});
const urlStyle = css({
  fontFamily: "mono",
  fontSize: "xs",
  color: "fg.default",
  overflowWrap: "anywhere",
});
const urlPrefixStyle = css({ opacity: 0.7 });
const hintStyle = css({ fontSize: "xs", color: "fg.muted" });

export interface ProductBasicsCardProps {
  formData: ProductFormData;
  categories: Array<{ id: string; name: string }>;
  /** The admin's curated material list, offered before free text. */
  materials: CuratedValue[];
  onChange: (field: string, value: string | boolean) => void;
}

export function ProductBasicsCard({
  formData,
  categories,
  materials,
  onChange,
}: ProductBasicsCardProps) {
  const ids = useId();
  const [editingHandle, setEditingHandle] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Product</CardTitle>
        <CardDescription>Name, category and description</CardDescription>
      </CardHeader>
      <CardContent className={cardContentStyle}>
        <div className={fieldGrid3Style}>
          <div className={wideFieldStyle}>
            <Label htmlFor="name">
              Product Name<span className={requiredMarkStyle}>*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => onChange("name", e.target.value)}
              required
            />
          </div>

          <div className={fieldStyle}>
            <Label htmlFor="category">
              Category<span className={requiredMarkStyle}>*</span>
            </Label>
            <Select
              value={formData.categoryId}
              onValueChange={(value) => onChange("categoryId", value)}
              required
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className={fieldStyle}>
          <Label htmlFor={`${ids}-slug`}>Address on the site</Label>
          {editingHandle ? (
            <Input
              id={`${ids}-slug`}
              value={formData.slug}
              onChange={(e) => onChange("slug", e.target.value)}
              onBlur={() => setEditingHandle(false)}
              autoFocus
              required
            />
          ) : (
            <div className={urlRowStyle}>
              <Link2 className={css({ height: "3.5", width: "3.5", flexShrink: 0 })} />
              <span className={urlStyle}>
                <span className={urlPrefixStyle}>/product/</span>
                {formData.slug || <em>set from the name</em>}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onPress={() => setEditingHandle(true)}
                aria-label="Edit address"
              >
                <PencilLine className={css({ height: "3.5", width: "3.5", marginRight: "1" })} />
                Edit
              </Button>
              {/* Keeps the field in the form's native validation. */}
              <input type="hidden" id={`${ids}-slug`} value={formData.slug} readOnly required />
            </div>
          )}
        </div>

        <div className={fieldStyle}>
          <Label htmlFor={`${ids}-material`}>Material</Label>
          {/* A product-level fact, not a variant option: material moves the
              price, and a listing card shows one price per product, so the
              same design in two materials is two products. Curated values are
              offered first, with free text as the fallback. */}
          <Input
            id={`${ids}-material`}
            list={`${ids}-materials`}
            value={formData.material}
            placeholder="e.g. Sterling Silver"
            onChange={(e) => onChange("material", e.target.value)}
          />
          <datalist id={`${ids}-materials`}>
            {materials.map((m) => (
              <option key={m.value} value={m.label} />
            ))}
          </datalist>
          <p className={hintStyle}>
            The same design in another material is a separate product, because
            the price differs.
          </p>
        </div>

        <div className={fieldStyle}>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => onChange("description", e.target.value)}
            rows={4}
          />
        </div>
      </CardContent>
    </Card>
  );
}
