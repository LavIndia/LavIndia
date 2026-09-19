"use client";

import { useState } from "react";
import { css } from "styled-system/css";
import { GripVertical, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { InfoHint } from "@/components/ui/info-hint";
import type { LabelFormat } from "@/modules/catalog/barcodes/label-formats";
import {
  LABEL_ELEMENTS,
  defaultLayoutOverrides,
  type LabelElementId,
  type LabelLayoutOverrides,
} from "@/modules/catalog/barcodes/label-layout";

const wrapStyle = css({ display: "flex", flexDirection: "column", gap: "3" });
const headStyle = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "2",
});
const titleStyle = css({ fontSize: "sm", fontWeight: "semibold" });
const listStyle = css({ display: "flex", flexDirection: "column", gap: "1.5" });
const itemStyle = css({
  display: "flex",
  alignItems: "center",
  gap: "2.5",
  padding: "2",
  borderRadius: "md",
  border: "1px solid",
  borderColor: "border.subtle",
  background: "bg.surface",
  cursor: "grab",
  transition: "border-color 0.15s ease, opacity 0.15s ease",
  _hover: { borderColor: "border.default" },
  "&[data-dragging='true']": { opacity: 0.4 },
  "&[data-over='true']": { borderColor: "accent.default" },
  "&[data-hidden='true'] .element-name": { opacity: 0.45 },
});
const gripStyle = css({ height: "4", width: "4", color: "fg.subtle", flexShrink: 0 });
const itemMainStyle = css({ flex: "1", minWidth: "0", display: "flex", flexDirection: "column" });
const itemNameStyle = css({ fontSize: "sm" });
const itemNoteStyle = css({ fontSize: "xs", color: "fg.muted" });
const sliderRowStyle = css({ display: "flex", flexDirection: "column", gap: "1.5" });
const sliderHeadStyle = css({
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  fontSize: "xs",
  color: "fg.muted",
  fontVariantNumeric: "tabular-nums",
});
const toggleRowStyle = css({
  display: "flex",
  alignItems: "center",
  gap: "3",
  fontSize: "sm",
  paddingLeft: "7",
});
const warnStyle = css({ fontSize: "xs", color: "red.600" });

/**
 * The admin's own control over how a label is laid out.
 *
 * The computed budget is a good default, but the person printing has context
 * no algorithm has — a display case where the price must read across a room,
 * a tag where the SKU matters more than the name. So the stacking order is
 * dragged, blocks are switched off, and the two values that fight hardest
 * for space (bar height and text size) are dialled directly.
 *
 * Reordering uses the platform's own drag events rather than a library: the
 * list is five rows long and never nests, which is precisely the case the
 * native API handles well.
 */
export function LabelLayoutDesigner({
  format,
  overrides,
  onChange,
  /** Bar height the budget arrives at on its own, shown as the baseline. */
  computedBarcodeHeightMm,
  overflowing,
}: {
  format: LabelFormat;
  overrides: LabelLayoutOverrides;
  onChange: (next: LabelLayoutOverrides) => void;
  computedBarcodeHeightMm: number;
  overflowing: boolean;
}) {
  const [dragging, setDragging] = useState<LabelElementId | null>(null);
  const [over, setOver] = useState<LabelElementId | null>(null);

  const move = (from: LabelElementId, to: LabelElementId) => {
    if (from === to) return;
    const order = overrides.order.filter((id) => id !== from);
    order.splice(order.indexOf(to), 0, from);
    onChange({ ...overrides, order });
  };

  const toggleHidden = (id: LabelElementId, visible: boolean) =>
    onChange({
      ...overrides,
      hidden: visible
        ? overrides.hidden.filter((entry) => entry !== id)
        : [...overrides.hidden, id],
    });

  const isDefault =
    JSON.stringify(overrides) === JSON.stringify(defaultLayoutOverrides(format));

  return (
    <div className={wrapStyle}>
      <div className={headStyle}>
        <span className={titleStyle}>
          Layout
          <InfoHint label="About the layout" below>
            Drag a row to change the stacking order, and switch off anything
            this label does not need. Whatever space is freed goes to the
            barcode first and is then spread evenly, so the label never ends
            up with a blank band through the middle of it. These settings are
            remembered per label format, on this device only.
          </InfoHint>
        </span>
        {!isDefault && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange(defaultLayoutOverrides(format))}
          >
            <RotateCcw className={css({ height: "3.5", width: "3.5" })} />
            Reset
          </Button>
        )}
      </div>

      <ul className={listStyle}>
        {overrides.order.map((id) => {
          const element = LABEL_ELEMENTS.find((entry) => entry.id === id)!;
          const visible = !overrides.hidden.includes(id);

          return (
            <li key={id}>
              <div
                className={itemStyle}
                draggable
                data-dragging={dragging === id}
                data-over={over === id && dragging !== id}
                data-hidden={!visible}
                onDragStart={() => setDragging(id)}
                onDragEnd={() => {
                  setDragging(null);
                  setOver(null);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setOver(id);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  if (dragging) move(dragging, id);
                  setDragging(null);
                  setOver(null);
                }}
              >
                <GripVertical className={gripStyle} aria-hidden />
                <span className={itemMainStyle}>
                  <span className={`${itemNameStyle} element-name`}>{element.name}</span>
                  <span className={itemNoteStyle}>{element.note}</span>
                </span>
                {/* The barcode is the point of the label; it cannot be
                    switched off, only moved. */}
                {id !== "barcode" && (
                  <Switch
                    checked={visible}
                    onCheckedChange={(next) => toggleHidden(id, next)}
                    aria-label={`Show ${element.name}`}
                  />
                )}
              </div>

              {id === "footer" && visible && (
                <div className={css({ display: "flex", flexDirection: "column", gap: "1.5", paddingTop: "1.5" })}>
                  <label className={toggleRowStyle}>
                    <Switch
                      checked={overrides.showSku}
                      onCheckedChange={(showSku) => onChange({ ...overrides, showSku })}
                    />
                    SKU
                  </label>
                  <label className={toggleRowStyle}>
                    <Switch
                      checked={overrides.showPrice}
                      onCheckedChange={(showPrice) => onChange({ ...overrides, showPrice })}
                    />
                    Price
                  </label>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className={sliderRowStyle}>
        <span className={sliderHeadStyle}>
          <Label htmlFor="label-text-scale">Text size</Label>
          <span>{Math.round(overrides.textScale * 100)}%</span>
        </span>
        <Slider
          id="label-text-scale"
          minValue={75}
          maxValue={140}
          step={5}
          value={[Math.round(overrides.textScale * 100)]}
          onChange={(value) =>
            onChange({ ...overrides, textScale: (value as number[])[0] / 100 })
          }
        />
      </div>

      <div className={sliderRowStyle}>
        <span className={sliderHeadStyle}>
          <Label htmlFor="label-bar-height">Barcode height</Label>
          <span>
            {(overrides.barcodeHeightMm ?? computedBarcodeHeightMm).toFixed(1)} mm
            {overrides.barcodeHeightMm === null ? " · automatic" : ""}
          </span>
        </span>
        <Slider
          id="label-bar-height"
          minValue={6}
          maxValue={Math.max(8, Math.round(format.labelHeightMm - 6))}
          step={0.5}
          value={[overrides.barcodeHeightMm ?? computedBarcodeHeightMm]}
          onChange={(value) =>
            onChange({ ...overrides, barcodeHeightMm: (value as number[])[0] })
          }
        />
        {overrides.barcodeHeightMm !== null && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange({ ...overrides, barcodeHeightMm: null })}
          >
            Back to automatic
          </Button>
        )}
      </div>

      {overflowing && (
        <p className={warnStyle}>
          More is switched on than fits at this size. Reduce the text size,
          shorten the barcode, or switch a row off — otherwise the bottom of
          the label will be clipped.
        </p>
      )}
    </div>
  );
}
