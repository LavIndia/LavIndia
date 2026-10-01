import { Badge } from "@/components/ui/badge";
import { customerTier, type TierThresholds } from "@/modules/customers/customer-tier";
import { css } from "styled-system/css";
import { customerHeading, formatJoined, formatRupees, type CustomerRow } from "./customer-display";

/**
 * The Customers list on a phone: one card per client, with the figures that
 * matter most — spend and tier — at the top, instead of a nine-column table
 * that would need sideways scrolling.
 */
const listStyle = css({ display: { base: "flex", md: "none" }, flexDirection: "column", gap: "3" });
const cardStyle = css({
  borderRadius: "xl",
  border: "1px solid",
  borderColor: "border.subtle",
  background: "bg.surface",
  boxShadow: "card",
  padding: "4",
  display: "flex",
  flexDirection: "column",
  gap: "3",
});
const topRowStyle = css({ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "3" });
const nameStyle = css({ fontWeight: "medium", color: "fg.default", wordBreak: "break-word" });
const subStyle = css({ fontSize: "xs", color: "fg.muted", wordBreak: "break-all" });
const spendStyle = css({ fontWeight: "semibold", color: "fg.default", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" });
const factsStyle = css({
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: "2",
  paddingTop: "3",
  borderTop: "1px solid",
  borderColor: "border.subtle",
});
const factLabelStyle = css({ fontSize: "xs", color: "fg.muted" });
const factValueStyle = css({ fontSize: "sm", color: "fg.default", fontVariantNumeric: "tabular-nums" });
const footStyle = css({ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "2", fontSize: "xs", color: "fg.muted" });
const savedStyle = css({ color: "success", fontWeight: "medium" });
const emptyStyle = css({ display: { base: "block", md: "none" }, textAlign: "center", paddingBlock: "8", color: "fg.muted" });

export function CustomerCardList({
  customers,
  thresholds,
  emptyMessage,
}: {
  customers: CustomerRow[];
  thresholds: TierThresholds;
  emptyMessage: string;
}) {
  if (customers.length === 0) return <p className={emptyStyle}>{emptyMessage}</p>;

  return (
    <div className={listStyle}>
      {customers.map((customer) => {
        const { title, details } = customerHeading(customer);
        const tier = customerTier(customer.totalSpent, thresholds);
        return (
          <div key={customer.id} className={cardStyle}>
            <div className={topRowStyle}>
              <div>
                {title && <p className={nameStyle}>{title}</p>}
                {details.map((line) => (
                  <p key={line} className={subStyle}>{line}</p>
                ))}
              </div>
              <div className={css({ textAlign: "right" })}>
                <p className={spendStyle}>{formatRupees(customer.totalSpent)}</p>
                <Badge variant={tier.variant}>{tier.label}</Badge>
              </div>
            </div>
            <div className={factsStyle}>
              <div>
                <p className={factLabelStyle}>Orders</p>
                <p className={factValueStyle}>{customer.orderCount}</p>
              </div>
              <div>
                <p className={factLabelStyle}>Successful</p>
                <p className={factValueStyle}>{customer.successfulOrders}</p>
              </div>
              <div>
                <p className={factLabelStyle}>Returned</p>
                <p className={factValueStyle}>{customer.returnedOrders}</p>
              </div>
            </div>
            <div className={footStyle}>
              <span>Joined {formatJoined(customer.createdAt)}</span>
              {customer.totalDiscount > 0 && (
                <span className={savedStyle}>Saved {formatRupees(customer.totalDiscount)}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
