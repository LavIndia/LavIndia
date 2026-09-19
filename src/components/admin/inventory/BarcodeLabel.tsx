import { code128Svg, code128TotalModules } from "@/modules/catalog/barcodes/code128";
import {
  barcodeModuleWidthMm,
  type LabelFormat,
} from "@/modules/catalog/barcodes/label-formats";
import {
  labelLayout,
  type LabelElementId,
  type LabelLayout,
  type LabelLayoutOverrides,
} from "@/modules/catalog/barcodes/label-layout";
import { formatPaisaCompact } from "@/modules/_shared/money";

export interface LabelData {
  productName: string;
  variantName: string;
  isDefaultVariant: boolean;
  sku: string | null;
  barcode: string;
  priceCents: number;
}

/**
 * One printed label.
 *
 * Laid out in millimetres so what appears on screen is the physical size that
 * comes out of the printer. Inline styles throughout on purpose: this markup
 * is also what the print stylesheet renders, and inline dimensions survive
 * print engines that drop or re-order external CSS.
 *
 * Space is budgeted rather than guessed, and the budget accounts for what
 * this particular label actually contains — see `labelLayout`. Fixed text is
 * measured first and the remainder goes to the bars, because slightly small
 * text is merely harder to read while a short barcode stops scanning.
 *
 * The stacking order and which blocks appear are the admin's to change, so
 * the blocks are rendered from the layout's list rather than hardcoded here.
 */
export function BarcodeLabel({
  data,
  format,
  overrides,
}: {
  data: LabelData;
  format: LabelFormat;
  overrides?: LabelLayoutOverrides;
}) {
  const layout = labelLayout(format, overrides, {
    hasVariantName: !data.isDefaultVariant,
    hasSku: Boolean(data.sku),
  });

  return (
    <div
      style={{
        width: `${format.labelWidthMm}mm`,
        height: `${format.labelHeightMm}mm`,
        boxSizing: "border-box",
        padding: `${layout.paddingMm}mm`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        // Centred as a block rather than spread to the edges: space-between
        // pins content to the die-cut boundary, where trimming tolerance can
        // clip it. Slack is absorbed into the gaps by the layout instead.
        justifyContent: "center",
        gap: `${layout.gapMm}mm`,
        overflow: "hidden",
        fontFamily: "Arial, Helvetica, sans-serif",
        color: "#000",
        background: "#fff",
        textAlign: "center",
      }}
    >
      {layout.blocks.map((block) => (
        <LabelBlock key={block} block={block} data={data} format={format} layout={layout} />
      ))}
    </div>
  );
}

function LabelBlock({
  block,
  data,
  format,
  layout,
}: {
  block: LabelElementId;
  data: LabelData;
  format: LabelFormat;
  layout: LabelLayout;
}) {
  switch (block) {
    case "brand":
      return (
        <div
          style={{
            fontSize: `${layout.brandFontMm}mm`,
            letterSpacing: `${layout.brandFontMm * 0.18}mm`,
            fontWeight: 700,
            lineHeight: 1.15,
          }}
        >
          LAVINDIA
        </div>
      );

    case "name":
      return (
        <div
          style={{
            fontSize: `${layout.nameFontMm}mm`,
            lineHeight: 1.15,
            fontWeight: 600,
            // A long name must never push the barcode off the label.
            display: "-webkit-box",
            WebkitLineClamp: layout.nameLines,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            maxWidth: "100%",
            wordBreak: "break-word",
          }}
        >
          {data.productName}
        </div>
      );

    case "variant":
      return (
        <div
          style={{
            fontSize: `${layout.variantFontMm}mm`,
            lineHeight: 1.15,
            opacity: 0.75,
            maxWidth: "100%",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {data.variantName}
        </div>
      );

    case "barcode":
      return <BarcodeBlock data={data} format={format} layout={layout} />;

    case "footer":
      return <FooterBlock data={data} layout={layout} />;
  }
}

/** Bars and their human-readable code, kept as one unit. */
function BarcodeBlock({
  data,
  format,
  layout,
}: {
  data: LabelData;
  format: LabelFormat;
  layout: LabelLayout;
}) {
  // Measured from the symbol that will actually print, so the bars are as
  // wide as the stock allows without running past its edge.
  const quietZoneModules = 10;
  const totalModules = code128TotalModules(data.barcode, quietZoneModules);

  const svg = code128Svg(data.barcode, {
    moduleWidth: barcodeModuleWidthMm(format, totalModules),
    height: layout.barcodeHeightMm,
    quietZoneModules,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.3mm" }}>
      <div style={{ lineHeight: 0 }} dangerouslySetInnerHTML={{ __html: svg }} />
      <div
        style={{
          fontSize: `${layout.codeFontMm}mm`,
          letterSpacing: `${layout.codeFontMm * 0.07}mm`,
          lineHeight: 1.15,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {data.barcode}
      </div>
    </div>
  );
}

/** SKU and price on one row — the two ends of the same line of information. */
function FooterBlock({ data, layout }: { data: LabelData; layout: LabelLayout }) {
  const sku = layout.showSku && data.sku ? data.sku : null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        // Opposite ends only when there are two of them; a lone value centres.
        justifyContent: sku && layout.showPrice ? "space-between" : "center",
        gap: "1.5mm",
        width: "100%",
        fontSize: `${layout.footerFontMm}mm`,
        lineHeight: 1.15,
      }}
    >
      {/* Omitted entirely when absent, rather than leaving a gap. */}
      {sku && (
        <span
          style={{
            opacity: 0.7,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            minWidth: 0,
          }}
        >
          {sku}
        </span>
      )}
      {layout.showPrice && (
        <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>
          {formatPaisaCompact(data.priceCents)}
        </span>
      )}
    </div>
  );
}
