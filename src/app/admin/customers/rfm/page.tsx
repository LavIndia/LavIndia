import { css } from "styled-system/css";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { buildRfmBoard, loadRfmFacts } from "@/modules/customers/rfm";
import { RfmSegmentList } from "@/components/admin/customers/RfmSegmentList";
import { RfmGrid } from "@/components/admin/customers/RfmGrid";
import { RfmCustomerTable } from "@/components/admin/customers/RfmCustomerTable";
import { formatPaisa } from "@/modules/_shared/money";

export const metadata = { title: "Customer segments" };

// The board reads every order the shop has taken, so it is recomputed at
// most once an hour rather than on each visit. Segments move over weeks.
export const revalidate = 3600;

const pageStyle = css({ display: "flex", flexDirection: "column", gap: "6" });
const topStyle = css({
  display: "grid",
  gridTemplateColumns: { base: "1fr", lg: "minmax(0, 1fr) minmax(0, 22rem)" },
  gap: "6",
  alignItems: "start",
});
const statRowStyle = css({ display: "flex", flexWrap: "wrap", gap: "6" });
const statStyle = css({ display: "flex", flexDirection: "column", gap: "0.5" });
const statValueStyle = css({
  fontFamily: "display",
  fontSize: "2xl",
  fontWeight: "semibold",
  color: "fg.default",
  fontVariantNumeric: "tabular-nums",
});
const statLabelStyle = css({ fontSize: "xs", color: "fg.muted" });
const noteStyle = css({ fontSize: "sm", color: "fg.muted", lineHeight: "relaxed", maxWidth: "48rem" });

export default async function RfmPage() {
  const board = buildRfmBoard(await loadRfmFacts());

  return (
    <div className={pageStyle}>
      <AdminPageHeader
        title="Customer segments"
        subtitle="Who buys, how recently, how often, and for how much."
      />

      <div className={statRowStyle}>
        <span className={statStyle}>
          <span className={statValueStyle}>{board.totalCustomers}</span>
          <span className={statLabelStyle}>Customers who have bought</span>
        </span>
        <span className={statStyle}>
          <span className={statValueStyle}>{formatPaisa(board.totalRevenueCents)}</span>
          <span className={statLabelStyle}>Lifetime revenue</span>
        </span>
        <span className={statStyle}>
          <span className={statValueStyle}>
            {board.segments.filter((s) => s.segment === "CHAMPIONS" || s.segment === "LOYAL")
              .reduce((n, s) => n + s.customers, 0)}
          </span>
          <span className={statLabelStyle}>Champions and loyal</span>
        </span>
        <span className={statStyle}>
          <span className={statValueStyle}>
            {board.segments.filter((s) => s.segment === "CANNOT_LOSE" || s.segment === "AT_RISK")
              .reduce((n, s) => n + s.customers, 0)}
          </span>
          <span className={statLabelStyle}>At risk of being lost</span>
        </span>
      </div>

      <div className={topStyle}>
        <RfmSegmentList segments={board.segments} />
        <RfmGrid grid={board.grid} />
      </div>

      <RfmCustomerTable customers={board.customers} />

      <p className={noteStyle}>
        {/* Said plainly because a segmentation that is not understood gets
            acted on wrongly. */}
        Scores are quintiles against this shop&rsquo;s own customers, not
        fixed rupee thresholds — a five for spending means the top fifth of
        what LavIndia&rsquo;s customers spend, which is the only comparison
        that means anything. Counter and online purchases by the same person
        are counted together, matched on mobile number. Cancelled and
        refunded orders are excluded.
      </p>
    </div>
  );
}
