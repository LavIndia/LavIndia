import { labelsPerPage, type LabelFormat } from "@/modules/catalog/barcodes/label-formats";
import type { LabelLayoutOverrides } from "@/modules/catalog/barcodes/label-layout";
import { BarcodeLabel, type LabelData } from "./BarcodeLabel";

/**
 * Labels laid out on their pages.
 *
 * The same component renders the on-screen preview and the printed output, so
 * what is previewed cannot drift from what comes out of the printer. Sizes
 * are in millimetres throughout; the preview simply scales the whole sheet
 * down with a CSS transform rather than using different dimensions.
 */
export function BarcodeSheet({
  labels,
  format,
  overrides,
  /** Scale for preview. 1 is physical size, which is what printing uses. */
  scale = 1,
}: {
  labels: LabelData[];
  format: LabelFormat;
  /** The admin's layout adjustments, applied to every label on the sheet. */
  overrides?: LabelLayoutOverrides;
  scale?: number;
}) {
  const perPage = labelsPerPage(format);
  const pages: LabelData[][] = [];
  for (let i = 0; i < labels.length; i += perPage) {
    pages.push(labels.slice(i, i + perPage));
  }
  if (pages.length === 0) pages.push([]);

  return (
    <div
      className="barcode-sheet-root"
      style={{
        transform: scale === 1 ? undefined : `scale(${scale})`,
        transformOrigin: "top left",
      }}
    >
      {pages.map((pageLabels, pageIndex) => (
        <div
          key={pageIndex}
          className="barcode-page"
          style={
            format.kind === "SHEET"
              ? {
                  width: "210mm",
                  minHeight: "297mm",
                  boxSizing: "border-box",
                  paddingTop: `${format.pageMarginTopMm}mm`,
                  paddingLeft: `${format.pageMarginLeftMm}mm`,
                  background: "#fff",
                  display: "grid",
                  gridTemplateColumns: `repeat(${format.columns}, ${format.labelWidthMm}mm)`,
                  // Rows are pinned to the label height. Without this the grid
                  // sizes rows to their content, and a label with a short
                  // product name comes out shorter than the die-cut stock —
                  // so every row below it drifts further out of alignment.
                  gridAutoRows: `${format.labelHeightMm}mm`,
                  columnGap: `${format.columnGapMm}mm`,
                  rowGap: `${format.rowGapMm}mm`,
                  alignContent: "start",
                }
              : {
                  // Roll stock: one label per page, no margins at all.
                  width: `${format.labelWidthMm}mm`,
                  background: "#fff",
                  display: "flex",
                  flexDirection: "column",
                }
          }
        >
          {pageLabels.map((label, index) => (
            <BarcodeLabel
              key={`${label.barcode}-${index}`}
              data={label}
              format={format}
              overrides={overrides}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Print rules for the sheet.
 *
 * `@page` with an explicit size and zero margin is what stops the browser
 * adding its own margin and shifting every label a few millimetres off the
 * die-cut stock — the usual reason a first print run is wasted.
 */
export function BarcodePrintStyles({ format }: { format: LabelFormat }) {
  const pageSize =
    format.kind === "SHEET"
      ? "A4 portrait"
      : `${format.labelWidthMm}mm ${format.labelHeightMm}mm`;

  return (
    <style>{`
      @media print {
        @page { size: ${pageSize}; margin: 0; }
        html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
        /* Everything that is not the sheet is hidden, so the admin chrome
           never appears on a label. */
        body * { visibility: hidden !important; }
        .barcode-print-area, .barcode-print-area * { visibility: visible !important; }
        .barcode-print-area {
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: auto !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        /* The preview scales the sheet down to fit on screen. That scale is
           an inline style, so it must be beaten with !important here or the
           whole sheet prints shrunk — undersized labels on a mostly blank
           page, which is exactly the kind of waste a first print run cannot
           afford. */
        .barcode-print-area {
          transform: none !important;
          zoom: 1 !important;
          width: auto !important;
          height: auto !important;
          max-height: none !important;
          overflow: visible !important;
        }
        .barcode-sheet-root { transform: none !important; }
        .barcode-page { break-after: page; page-break-after: always; }
        .barcode-page:last-child { break-after: auto; page-break-after: auto; }
        /* Bars must print as solid black even in "save ink" modes. */
        .barcode-page, .barcode-page * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      }
    `}</style>
  );
}
