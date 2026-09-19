import { css } from "styled-system/css";
import { segmentLabel, type RfmCustomer } from "@/modules/customers/rfm";
import { formatPaisa } from "@/modules/_shared/money";

const wrapStyle = css({ display: "flex", flexDirection: "column", gap: "3" });
const titleStyle = css({ fontSize: "sm", fontWeight: "semibold", color: "fg.default" });
const scrollStyle = css({ overflowX: "auto", minWidth: "0" });
const tableStyle = css({ width: "full", borderCollapse: "collapse", fontSize: "sm" });
const thStyle = css({
  textAlign: "left",
  padding: "2.5",
  fontSize: "xs",
  fontWeight: "medium",
  color: "fg.muted",
  borderBottom: "1px solid",
  borderColor: "border.subtle",
  whiteSpace: "nowrap",
});
const thNumStyle = css({
  textAlign: "right",
  padding: "2.5",
  fontSize: "xs",
  fontWeight: "medium",
  color: "fg.muted",
  borderBottom: "1px solid",
  borderColor: "border.subtle",
  whiteSpace: "nowrap",
});
const tdStyle = css({
  padding: "2.5",
  borderBottom: "1px solid",
  borderColor: "border.subtle",
  color: "fg.default",
});
const tdNumStyle = css({
  padding: "2.5",
  textAlign: "right",
  borderBottom: "1px solid",
  borderColor: "border.subtle",
  color: "fg.default",
  fontVariantNumeric: "tabular-nums",
  whiteSpace: "nowrap",
});
const mutedStyle = css({ fontSize: "xs", color: "fg.muted" });
const scoreStyle = css({
  fontFamily: "mono",
  fontSize: "xs",
  letterSpacing: "wide",
  color: "fg.muted",
  whiteSpace: "nowrap",
});
const channelStyle = css({ fontSize: "2xs", color: "fg.subtle", textTransform: "uppercase", letterSpacing: "wide" });

/** Whole days, said the way a person would say it. */
function sinceLabel(days: number | null): string {
  if (days === null) return "—";
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  const years = (days / 365).toFixed(1);
  return `${years} years ago`;
}

/**
 * The customers themselves, biggest spenders first.
 *
 * The segment is shown beside each one so a name can be acted on directly —
 * the summary above says how many are at risk, this says who to ring.
 */
export function RfmCustomerTable({ customers }: { customers: RfmCustomer[] }) {
  return (
    <div className={wrapStyle}>
      <span className={titleStyle}>Customers</span>
      <div className={scrollStyle}>
        <table className={tableStyle}>
          <thead>
            <tr>
              <th className={thStyle}>Customer</th>
              <th className={thStyle}>Segment</th>
              <th className={thStyle}>R F M</th>
              <th className={thNumStyle}>Orders</th>
              <th className={thNumStyle}>Spend</th>
              <th className={thNumStyle}>Last bought</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer.customerKey}>
                <td className={tdStyle}>
                  {customer.name ?? "Walk-in customer"}
                  {/* Only when we actually have one — an empty line under a
                      name reads as missing data rather than absent data. */}
                  {customer.mobile && (
                    <>
                      <br />
                      <span className={mutedStyle}>{customer.mobile}</span>
                    </>
                  )}
                  {customer.channels.length > 0 && (
                    <>
                      <br />
                      <span className={channelStyle}>{customer.channels.join(" + ")}</span>
                    </>
                  )}
                </td>
                <td className={tdStyle}>{segmentLabel(customer.segment).name}</td>
                <td className={tdStyle}>
                  <span className={scoreStyle}>
                    {customer.recency} {customer.frequency} {customer.monetary}
                  </span>
                </td>
                <td className={tdNumStyle}>{customer.orderCount}</td>
                <td className={tdNumStyle}>{formatPaisa(customer.totalSpendCents)}</td>
                <td className={tdNumStyle}>{sinceLabel(customer.recencyDays)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
