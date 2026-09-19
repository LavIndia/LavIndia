"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Printer } from "lucide-react";
import { css } from "styled-system/css";
import {
  LABEL_FORMATS,
  DEFAULT_LABEL_FORMAT,
  getLabelFormat,
  labelsPerPage,
} from "@/modules/catalog/barcodes/label-formats";
import { labelLayout } from "@/modules/catalog/barcodes/label-layout";
import { InfoHint } from "@/components/ui/info-hint";
import { VariantSearchField } from "./VariantSearchField";
import type { LabelData } from "./BarcodeLabel";
import { BarcodeSheet, BarcodePrintStyles } from "./BarcodeSheet";
import { LabelPickList, type LabelPick } from "./LabelPickList";
import { LabelActualSize } from "./LabelActualSize";
import { LabelLayoutDesigner } from "./LabelLayoutDesigner";
import { useLabelLayoutOverrides } from "./useLabelLayoutOverrides";
import { useFitScale } from "./useFitScale";
import type { LookupResult } from "./useVariantLookup";

/**
 * Three working columns on a wide screen: what to print, how it is laid out,
 * and the sheet itself.
 *
 * A two-column split put everything on the left in one tall stack — the
 * layout controls sat below the fold while half the window was taken up by a
 * blank sheet. Splitting the controls apart means the sample label and the
 * controls that change it are side by side, which is the pair the eye
 * actually moves between.
 */
const gridStyle = css({
  display: "grid",
  gridTemplateColumns: {
    // minmax(0, ...) rather than a bare 1fr: a grid track otherwise refuses
    // to shrink below its content, and the sheet inside the preview is a
    // fixed 210mm. Without this the whole page inherits that width and
    // scrolls sideways on a phone.
    base: "minmax(0, 1fr)",
    lg: "minmax(0, 22rem) minmax(0, 1fr)",
    xl: "minmax(0, 21rem) minmax(0, 20rem) minmax(0, 1fr)",
  },
  gap: "6",
  alignItems: "start",
});
const panelStyle = css({ display: "flex", flexDirection: "column", gap: "4", minWidth: "0" });
const fieldStyle = css({ display: "flex", flexDirection: "column", gap: "2" });
const hintStyle = css({ fontSize: "xs", color: "fg.muted" });
const previewFrameStyle = css({
  border: "1px solid",
  borderColor: "border.subtle",
  borderRadius: "md",
  background: "bg.canvas",
  padding: "4",
  // The sheet is scaled to the column, so there is never anything to reach
  // sideways for. Vertical scrolling is left to the page.
  overflowX: "hidden",
  overflowY: "visible",
});
const previewHeadStyle = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "3",
  marginBottom: "3",
});
const sectionTitleStyle = css({ fontSize: "sm", fontWeight: "semibold" });
/** Only a divider when the two panels share a column, which is below xl. */
const dividerStyle = css({
  borderTop: "1px solid",
  borderColor: "border.subtle",
  paddingTop: "4",
  xl: { borderTop: "none", paddingTop: "0" },
});
/** The preview column spans the full width once the controls stack. */
const previewColumnStyle = css({
  gridColumn: { base: "auto", lg: "1 / -1", xl: "auto" },
  minWidth: "0",
});
const previewEmptyStyle = css({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "2",
  minHeight: "20rem",
  padding: "8",
  textAlign: "center",
  border: "1px dashed",
  borderColor: "border.subtle",
  borderRadius: "md",
  color: "fg.muted",
});
const previewEmptyTitleStyle = css({ fontSize: "sm", fontWeight: "medium", color: "fg.default" });
const previewEmptyTextStyle = css({ fontSize: "xs", maxWidth: "22rem", lineHeight: "relaxed" });

/**
 * A stand-in so the sample label and the layout controls have something to
 * act on before anything is chosen.
 *
 * Without it the whole left side of the screen sat empty until the first
 * search, which is the worst moment to give someone nothing to look at — it
 * is exactly when they are working out what this screen does. Marked as a
 * sample wherever it is shown, so it can never be mistaken for a real piece.
 */
const PLACEHOLDER_LABEL: LabelData = {
  productName: "Sample Product",
  variantName: "Default",
  isDefaultVariant: true,
  sku: "LAV-SAMPLE-0001",
  barcode: "LAV0000000000",
  priceCents: 159900,
};

/**
 * Choosing what to print, and seeing it before any paper is used.
 *
 * Label stock is expensive and a misaligned first run wastes a whole sheet,
 * so the preview shows the real sheet at true proportions — same component
 * that prints, just scaled — rather than an approximation.
 *
 * Composition only: the pick list, the measured sample and the layout
 * designer each own their own markup, and this screen holds the state they
 * share.
 */
export function BarcodePrintStudio() {
  const [formatId, setFormatId] = useState<string>(DEFAULT_LABEL_FORMAT);
  const [picks, setPicks] = useState<LabelPick[]>([]);
  const format = getLabelFormat(formatId);
  const [overrides, setOverrides] = useLabelLayoutOverrides(format);

  const addVariant = (variant: LookupResult) => {
    if (!variant.barcode) return;
    setPicks((current) => {
      const index = current.findIndex((p) => p.variant.variantId === variant.variantId);
      if (index === -1) return [...current, { variant, quantity: 1 }];
      const next = [...current];
      next[index] = { ...next[index], quantity: next[index].quantity + 1 };
      return next;
    });
  };

  const setQuantity = (variantId: string, quantity: number) =>
    setPicks((current) =>
      current.map((p) =>
        p.variant.variantId === variantId
          ? { ...p, quantity: Math.max(1, Math.floor(quantity) || 1) }
          : p,
      ),
    );

  const remove = (variantId: string) =>
    setPicks((current) => current.filter((p) => p.variant.variantId !== variantId));

  /** One entry per physical label, which is what the sheet lays out. */
  const labels: LabelData[] = useMemo(
    () =>
      picks.flatMap((pick) =>
        Array.from({ length: pick.quantity }, () => ({
          productName: pick.variant.productName,
          variantName: pick.variant.variantName,
          isDefaultVariant: pick.variant.isDefault,
          sku: pick.variant.sku,
          barcode: pick.variant.barcode!,
          priceCents: pick.variant.priceCents,
        })),
      ),
    [picks],
  );

  // A4 is 210mm wide; roll stock is as wide as one label and is enlarged
  // instead, since a 38mm tag shown at true size is unreadable on screen.
  const sheetWidthMm = format.kind === "SHEET" ? 210 : format.labelWidthMm;
  const sheetHeightMm = format.kind === "SHEET" ? 297 : format.labelHeightMm;
  const { ref: previewRef, scale: previewScale } = useFitScale(
    sheetWidthMm,
    format.kind === "SHEET" ? 1 : 2.5,
    // A whole sheet is shown at once so its alignment can be judged; a single
    // roll label is small enough that only its width needs constraining.
    format.kind === "SHEET" ? sheetHeightMm : undefined,
  );

  const totalLabels = labels.length;
  const perPage = labelsPerPage(format);
  const pageCount = Math.max(1, Math.ceil(totalLabels / perPage));
  const sample = labels[0];
  const sampleLabel = sample ?? PLACEHOLDER_LABEL;

  // The designer needs the budget for the sample it is being judged against,
  // so the numbers it shows match the label on screen rather than a generic
  // one. With nothing picked yet, assume the fullest case.
  const sampleContent = {
    hasVariantName: !sampleLabel.isDefaultVariant,
    hasSku: Boolean(sampleLabel.sku),
  };
  const sampleLayout = labelLayout(format, overrides, sampleContent);
  const automaticLayout = labelLayout(
    format,
    { ...overrides, barcodeHeightMm: null },
    sampleContent,
  );

  return (
    <>
      <BarcodePrintStyles format={format} />

      <div className={gridStyle}>
        <div className={panelStyle}>
          <div className={fieldStyle}>
            <Label htmlFor="label-format">
              Label format
              <InfoHint label="About label formats" below>
                Sizes match label stock you can buy off the shelf. The sheet
                formats print on A4; the roll formats print one label at a time
                for a thermal label printer.
              </InfoHint>
            </Label>
            <Select value={formatId} onValueChange={setFormatId}>
              <SelectTrigger id="label-format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LABEL_FORMATS.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {format.equivalent && <span className={hintStyle}>{format.equivalent}</span>}
          </div>

          <div className={fieldStyle}>
            <Label htmlFor="label-search">Add items</Label>
            <VariantSearchField onSelect={addVariant} />
            <span className={hintStyle}>
              Scan a barcode, or search by product name or SKU. Add the same item
              again to increase its count.
            </span>
          </div>

          <LabelPickList picks={picks} onQuantityChange={setQuantity} onRemove={remove} />

          <Button onClick={() => window.print()} disabled={totalLabels === 0}>
            <Printer className={css({ height: "4", width: "4" })} />
            Print {totalLabels > 0 ? `${totalLabels} label${totalLabels === 1 ? "" : "s"}` : ""}
          </Button>
        </div>

        <div className={panelStyle}>
          <LabelActualSize
            sample={sampleLabel}
            format={format}
            overrides={overrides}
            layout={sampleLayout}
            isPlaceholder={!sample}
          />

          <div className={dividerStyle}>
            <LabelLayoutDesigner
              format={format}
              overrides={overrides}
              onChange={setOverrides}
              computedBarcodeHeightMm={automaticLayout.barcodeHeightMm}
              overflowing={sampleLayout.overflowing}
            />
          </div>
        </div>

        <div className={previewColumnStyle}>
          <div className={previewHeadStyle}>
            <span className={sectionTitleStyle}>Preview</span>
            <span className={hintStyle}>
              {totalLabels} label{totalLabels === 1 ? "" : "s"} · {pageCount}{" "}
              {format.kind === "SHEET" ? "sheet" : "label"}
              {pageCount === 1 ? "" : "s"} · {perPage} per sheet
            </span>
          </div>

          {totalLabels === 0 ? (
            // A blank A4 rectangle is not a preview of anything — it is just
            // a large white hole where the answer should be.
            <div className={previewEmptyStyle}>
              <span className={previewEmptyTitleStyle}>Nothing to print yet</span>
              <span className={previewEmptyTextStyle}>
                Scan a barcode or search for a piece above, and the sheet will
                build up here exactly as it will come out of the printer.
              </span>
            </div>
          ) : (
          <div className={previewFrameStyle} ref={previewRef}>
            {/* The print area is the same markup that prints; the preview only
                scales it, so the two cannot drift apart. The wrapper is given
                the scaled height because a CSS transform does not affect
                layout — without it the frame keeps the unscaled height and
                leaves a tall empty gap beneath the sheet. */}
            <div
              style={{
                height: `${sheetHeightMm * previewScale * pageCount}mm`,
                width: "100%",
                overflow: "hidden",
              }}
            >
              <div
                className="barcode-print-area"
                style={{
                  width: `${sheetWidthMm}mm`,
                  transform: `scale(${previewScale})`,
                  transformOrigin: "top left",
                }}
              >
                <BarcodeSheet labels={labels} format={format} overrides={overrides} />
              </div>
            </div>
          </div>
          )}
        </div>
      </div>
    </>
  );
}
