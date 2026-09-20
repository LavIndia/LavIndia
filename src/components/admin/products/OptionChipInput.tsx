"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CuratedValue } from "@/components/admin/products/product-form-types";
import {
  chipRemoveStyle,
  chipStyle,
  chipsWrapStyle,
  colorSwatchStyle,
  curatedPillActiveStyle,
  curatedPillStyle,
  optionInputRowStyle,
  optionRowStyle,
} from "@/components/admin/products/product-form.styles";
import { css, cx } from "styled-system/css";

/**
 * One option dimension (Color, Size or Material) as a row of pickable chips
 * plus a free-text box.
 *
 * The curated pills come from the admin-maintained filter options, so the
 * catalog stays consistent; the text box is the escape hatch for the value
 * nobody has added to that list yet.
 */
export function OptionChipInput({
  label,
  placeholder,
  values,
  curatedValues,
  onAdd,
  onRemove,
}: {
  label: string;
  placeholder: string;
  values: string[];
  curatedValues?: CuratedValue[];
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
}) {
  const [draft, setDraft] = useState("");

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed) onAdd(trimmed);
    setDraft("");
  };

  return (
    <div className={optionRowStyle}>
      <Label>{label}</Label>

      {curatedValues && curatedValues.length > 0 && (
        <div className={chipsWrapStyle}>
          {curatedValues.map((curated) => {
            const active = values.some(
              (v) => v.toLowerCase() === curated.label.toLowerCase(),
            );
            return (
              <button
                key={curated.value}
                type="button"
                onClick={() => (active ? onRemove(curated.label) : onAdd(curated.label))}
                className={cx(
                  curatedPillStyle,
                  active && curatedPillActiveStyle,
                )}
              >
                {curated.color && (
                  <span
                    className={colorSwatchStyle}
                    style={{ background: curated.color }}
                  />
                )}
                {curated.label}
              </button>
            );
          })}
        </div>
      )}

      <div className={optionInputRowStyle}>
        <Input
          placeholder={placeholder}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              commit();
            }
          }}
        />
        <Button type="button" variant="outline" onClick={commit}>
          Add custom
        </Button>
      </div>
      {values.length > 0 && (
        <div className={chipsWrapStyle}>
          {values.map((value) => (
            <span key={value} className={chipStyle}>
              {value}
              <X
                className={cx(chipRemoveStyle, css({ height: "3", width: "3" }))}
                onClick={() => onRemove(value)}
              />
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
