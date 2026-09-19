import Link from "next/link";
import { css, cx } from "styled-system/css";
import { formatPaisa } from "@/modules/_shared/money";
import type { ProductSales, LowStockItem } from "@/modules/analytics/sales-insights";

const tableStyle = css({ width: "full", borderCollapse: "collapse", fontSize: "sm" });
const headCellStyle = css({
  textAlign: "left",
  fontSize: "xs",
  fontWeight: "medium",
  color: "fg.muted",
  paddingBottom: "2",
  paddingRight: "3",
  borderBottom: "1px solid",
  borderColor: "border.subtle",
  whiteSpace: "nowrap",
});
const cellStyle = css({
  paddingBlock: "2.5",
  paddingRight: "3",
  borderBottom: "1px solid",
  borderColor: "border.subtle",
  verticalAlign: "top",
});
const rightStyle = css({ textAlign: "right", fontVariantNumeric: "tabular-nums" });
const nameStyle = css({ fontWeight: "medium", color: "fg.default" });
const subStyle = css({ fontSize: "xs", color: "fg.muted" });
const rankStyle = css({ color: "fg.muted", fontVariantNumeric: "tabular-nums", width: "8" });
const emptyStyle = css({ fontSize: "sm", color: "fg.muted", paddingBlock: "4" });
const splitStyle = css({ fontSize: "xs", color: "fg.muted", whiteSpace: "nowrap" });
const lowStyle = css({ color: "danger", fontWeight: "medium" });

/**
 * What actually sold, ranked by pieces.
 *
 * Pieces lead rather than revenue because this answers "what is moving" —
 * the thing you reorder on. Revenue sits beside it, and the counter/web split
 * is shown per product, which is the question a shop with both actually has:
 * something selling only online needs different handling from something that
 * only ever leaves across the counter.
 */
export function TopProductsTable({ products }: { products: ProductSales[] }) {
  if (products.length === 0) {
    return <p className={emptyStyle}>Nothing has sold in this period yet.</p>;
  }

  return (
    <table className={tableStyle}>
      <thead>
        <tr>
          <th className={headCellStyle} />
          <th className={headCellStyle}>Product</th>
          <th className={cx(headCellStyle, rightStyle)}>Pieces</th>
          <th className={headCellStyle}>Counter / Web</th>
          <th className={cx(headCellStyle, rightStyle)}>Value</th>
        </tr>
      </thead>
      <tbody>
        {products.map((product, index) => (
          <tr key={product.productId}>
            <td className={cx(cellStyle, rankStyle)}>{index + 1}</td>
            <td className={cellStyle}>
              <div className={nameStyle}>{product.name}</div>
              {product.categoryName && (
                <div className={subStyle}>{product.categoryName}</div>
              )}
            </td>
            <td className={cx(cellStyle, rightStyle)}>{product.pieces}</td>
            <td className={cellStyle}>
              <span className={splitStyle}>
                {product.storePieces} / {product.onlinePieces}
              </span>
            </td>
            <td className={cx(cellStyle, rightStyle)}>
              {formatPaisa(product.revenueCents)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * What is about to run out.
 *
 * Not scoped to the chosen period — needing to reorder is a fact about right
 * now, not about the last thirty days, and showing it beside what is selling
 * is what turns the ranking into a decision.
 */
export function LowStockTable({ items }: { items: LowStockItem[] }) {
  if (items.length === 0) {
    return <p className={emptyStyle}>Everything is above its reorder point.</p>;
  }

  return (
    <table className={tableStyle}>
      <thead>
        <tr>
          <th className={headCellStyle}>Item</th>
          <th className={cx(headCellStyle, rightStyle)}>Available</th>
          <th className={cx(headCellStyle, rightStyle)}>Reorder at</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={`${item.productName}-${item.sku ?? ""}`}>
            <td className={cellStyle}>
              <div className={nameStyle}>{item.productName}</div>
              {item.sku && <div className={subStyle}>{item.sku}</div>}
            </td>
            <td className={cx(cellStyle, rightStyle)}>
              <span className={item.available <= 0 ? lowStyle : undefined}>
                {item.available <= 0 ? "Out of stock" : item.available}
              </span>
            </td>
            <td className={cx(cellStyle, rightStyle, subStyle)}>{item.reorderPoint}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const linkRowStyle = css({
  display: "flex",
  justifyContent: "flex-end",
  fontSize: "xs",
});
const linkStyle = css({
  color: "accent.default",
  textDecoration: "underline",
  textUnderlineOffset: "2px",
});

export function StockLink() {
  return (
    <div className={linkRowStyle}>
      <Link href="/admin/inventory/stock" className={linkStyle}>
        Open Stock to receive more
      </Link>
    </div>
  );
}
