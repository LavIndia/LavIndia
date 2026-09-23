import Link from "next/link";
import { css } from "styled-system/css";
import { formatPaisa } from "@/modules/_shared/money";
import type { ProductMargin } from "@/modules/accounting";
import type { SupplierSpend } from "@/modules/purchasing";

/**
 * The two tables the accounting screen is built around: what each product
 * earned, and what was spent with each supplier.
 *
 * Both scroll sideways rather than wrapping on a phone. A money table that
 * wraps stops being readable as a table, and the owner reads this screen
 * from a phone as often as from a desk.
 */

const scrollStyle = css({ overflowX: "auto", marginX: "-1", paddingX: "1" });
const tableStyle = css({
  width: "full",
  minWidth: "[34rem]",
  borderCollapse: "collapse",
  fontSize: "sm",
});
const thStyle = css({
  textAlign: "left",
  fontSize: "xs",
  fontWeight: "medium",
  color: "fg.muted",
  paddingY: "2",
  paddingRight: "3",
  borderBottom: "1px solid",
  borderColor: "border.subtle",
  whiteSpace: "nowrap",
});
const thRightStyle = css({
  textAlign: "right",
  fontSize: "xs",
  fontWeight: "medium",
  color: "fg.muted",
  paddingY: "2",
  paddingLeft: "3",
  borderBottom: "1px solid",
  borderColor: "border.subtle",
  whiteSpace: "nowrap",
});
const tdStyle = css({
  paddingY: "2.5",
  paddingRight: "3",
  borderBottom: "1px solid",
  borderColor: "border.subtle",
  color: "fg.default",
});
const tdRightStyle = css({
  paddingY: "2.5",
  paddingLeft: "3",
  textAlign: "right",
  borderBottom: "1px solid",
  borderColor: "border.subtle",
  fontVariantNumeric: "tabular-nums",
  whiteSpace: "nowrap",
});
const nameStyle = css({
  fontWeight: "medium",
  color: "accent.pressed",
  textDecoration: "none",
  _hover: { textDecoration: "underline" },
});
const emptyStyle = css({ fontSize: "sm", color: "fg.muted", paddingY: "4" });
const partialStyle = css({
  fontSize: "xs",
  color: "fg.muted",
  fontStyle: "italic",
});
const positiveStyle = css({ color: "success", fontVariantNumeric: "tabular-nums" });
const negativeStyle = css({ color: "danger", fontVariantNumeric: "tabular-nums" });

export function ProductMarginTable({ rows }: { rows: ProductMargin[] }) {
  if (rows.length === 0) {
    return <p className={emptyStyle}>No sales in this period.</p>;
  }

  return (
    <div className={scrollStyle}>
      <table className={tableStyle}>
        <thead>
          <tr>
            <th className={thStyle}>Product</th>
            <th className={thRightStyle}>Sold</th>
            <th className={thRightStyle}>Revenue</th>
            <th className={thRightStyle}>Cost</th>
            <th className={thRightStyle}>Profit</th>
            <th className={thRightStyle}>Margin</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.productId}>
              <td className={tdStyle}>
                <Link href={`/admin/products/${row.productId}/edit`} className={nameStyle}>
                  {row.name}
                </Link>
                {/* Said plainly rather than shown as an asterisk: a profit
                    figure missing some of its costs is worth knowing about. */}
                {row.partial && (
                  <div className={partialStyle}>
                    {row.profitCents === null
                      ? "no cost recorded, so margin is unknown"
                      : "some lines have no cost recorded"}
                  </div>
                )}
              </td>
              <td className={tdRightStyle}>{row.unitsSold}</td>
              <td className={tdRightStyle}>{formatPaisa(row.revenueCents)}</td>
              <td className={tdRightStyle}>
                {row.costCents > 0 ? formatPaisa(row.costCents) : "—"}
              </td>
              <td className={tdRightStyle}>
                {/* An em dash, not a zero: an unknown cost makes the profit
                    unknown, and printing a number here would invent one. */}
                {row.profitCents === null ? (
                  "—"
                ) : (
                  <span className={row.profitCents >= 0 ? positiveStyle : negativeStyle}>
                    {formatPaisa(row.profitCents)}
                  </span>
                )}
              </td>
              <td className={tdRightStyle}>
                {row.marginPercent === null ? "—" : `${row.marginPercent}%`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SupplierSpendTable({ rows }: { rows: SupplierSpend[] }) {
  if (rows.length === 0) {
    return (
      <p className={emptyStyle}>
        No stock received from a named supplier in this period. Choose a supplier when
        receiving stock and the spend will be totalled here.
      </p>
    );
  }

  return (
    <div className={scrollStyle}>
      <table className={tableStyle}>
        <thead>
          <tr>
            <th className={thStyle}>Supplier</th>
            <th className={thRightStyle}>Units</th>
            <th className={thRightStyle}>Spend</th>
            <th className={thRightStyle}>Last delivery</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.supplierId}>
              <td className={tdStyle}>
                {row.supplierName}
                {row.linesMissingCost > 0 && (
                  <div className={partialStyle}>
                    {row.linesMissingCost} line{row.linesMissingCost === 1 ? "" : "s"} with no
                    cost recorded
                  </div>
                )}
              </td>
              <td className={tdRightStyle}>{row.quantity}</td>
              <td className={tdRightStyle}>{formatPaisa(row.spendCents)}</td>
              <td className={tdRightStyle}>
                {row.lastReceivedAt
                  ? row.lastReceivedAt.toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                    })
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
