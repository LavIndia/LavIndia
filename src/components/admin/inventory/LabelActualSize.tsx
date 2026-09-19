"use client";

import { css } from "styled-system/css";
import { InfoHint } from "@/components/ui/info-hint";
import {
  barcodeModuleWidthMm,
  labelsPerPage,
  type LabelFormat,
} from "@/modules/catalog/barcodes/label-formats";
import type {
  LabelLayout,
  LabelLayoutOverrides,
} from "@/modules/catalog/barcodes/label-layout";
import { BarcodeLabel, type LabelData } from "./BarcodeLabel";

const fieldStyle = css({ display: "flex", flexDirection: "column", gap: "2" });
const sectionTitleStyle = css({ fontSize: "sm", fontWeight: "semibold" });
const singleLabelFrameStyle = css({
  display: "inline-block",
  border: "1px dashed",
  borderColor: "border.subtle",
  background: "#fff",
});

/** The measurement rail drawn beside and beneath the sample label. */
const measuredWrapStyle = css({ display: "inline-flex", flexDirection: "column", gap: "1" });
const measureRowStyle = css({ display: "flex", alignItems: "stretch", gap: "1" });
const widthRuleStyle = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "1.5",
  fontSize: "10px",
  color: "fg.muted",
  fontVariantNumeric: "tabular-nums",
  borderTop: "1px solid",
  borderColor: "border.subtle",
  paddingTop: "1",
});
const heightRuleStyle = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  writingMode: "vertical-rl",
  fontSize: "10px",
  color: "fg.muted",
  fontVariantNumeric: "tabular-nums",
  borderRight: "1px solid",
  borderColor: "border.subtle",
  paddingRight: "1",
});
const specListStyle = css({
  display: "grid",
  gridTemplateColumns: "auto 1fr",
  columnGap: "3",
  rowGap: "0.5",
  fontSize: "xs",
  color: "fg.muted",
  fontVariantNumeric: "tabular-nums",
});
const specLabelStyle = css({ color: "fg.subtle" });

/**
 * One label at true physical size, measured on two sides.
 *
 * Label stock is expensive and a misaligned first run wastes a whole sheet,
 * so the dimensions are stated in millimetres rather than left to be inferred
 * from what the screen happens to show.
 */
export function LabelActualSize({
  sample,
  format,
  overrides,
  layout,
  isPlaceholder = false,
}: {
  sample: LabelData;
  format: LabelFormat;
  overrides: LabelLayoutOverrides;
  layout: LabelLayout;
  /** True when nothing is chosen yet and a stand-in is being shown. */
  isPlaceholder?: boolean;
}) {
  const moduleWidth = barcodeModuleWidthMm(format);

  return (
    <div className={fieldStyle}>
      <span className={sectionTitleStyle}>
        {isPlaceholder ? "Actual size · sample" : "Actual size"}
        <InfoHint label="About actual size" below>
          Rendered at true physical dimensions. Hold a sheet of your label
          stock against the screen to confirm the size before committing a
          print run. The narrow bar width is what decides whether a scanner
          reads it — below about 0.19 mm most handheld scanners begin to
          struggle.
        </InfoHint>
      </span>

      <span className={measuredWrapStyle}>
        <span className={measureRowStyle}>
          <span className={heightRuleStyle}>{format.labelHeightMm} mm</span>
          <span className={singleLabelFrameStyle}>
            <BarcodeLabel data={sample} format={format} overrides={overrides} />
          </span>
        </span>
        <span
          className={widthRuleStyle}
          style={{ width: `${format.labelWidthMm}mm`, marginLeft: "1.4rem" }}
        >
          {format.labelWidthMm} mm
        </span>
      </span>

      <div className={specListStyle}>
        <span className={specLabelStyle}>Label</span>
        <span>
          {format.labelWidthMm} × {format.labelHeightMm} mm
        </span>
        <span className={specLabelStyle}>Barcode height</span>
        <span>{layout.barcodeHeightMm.toFixed(1)} mm</span>
        <span className={specLabelStyle}>Narrow bar</span>
        <span>
          {moduleWidth.toFixed(2)} mm{moduleWidth <= 0.19 ? " (minimum)" : ""}
        </span>
        <span className={specLabelStyle}>Per sheet</span>
        <span>
          {labelsPerPage(format)} · {format.columns} across × {format.rows} down
        </span>
      </div>
    </div>
  );
}
