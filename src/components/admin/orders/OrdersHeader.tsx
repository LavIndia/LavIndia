"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Download, Store } from "lucide-react";
import { css } from "styled-system/css";

const headerRowStyle = css({
  display: "flex",
  flexDirection: { base: "column", sm: "row" },
  gap: "4",
  sm: { alignItems: "flex-end", justifyContent: "space-between" },
});
const titleStyle = css({
  fontFamily: "display",
  fontSize: { base: "2xl", sm: "3xl" },
  fontWeight: "semibold",
  letterSpacing: "tight",
  color: "fg.default",
});
const subtitleStyle = css({ marginTop: "2", fontSize: "sm", color: "fg.muted" });
const actionsStyle = css({ display: "flex", alignItems: "center", gap: "2", flexWrap: "wrap" });
const iconStyle = css({ height: "4", width: "4" });

/**
 * The top of the Orders screen.
 *
 * Says plainly that both channels are here, because the screen replaced two
 * that were split by channel and anyone used to those needs to know their
 * counter sales did not go anywhere.
 */
export function OrdersHeader({
  shownCount,
  totalCount,
}: {
  shownCount: number;
  totalCount: number;
}) {
  return (
    <div className={headerRowStyle}>
      <div>
        <h1 className={titleStyle}>Orders</h1>
        <p className={subtitleStyle}>
          Every sale, from the counter and the website together
          {/* Stated only when the list is capped, so the count is never
              silently smaller than the total above it. */}
          {totalCount > shownCount
            ? ` · showing the latest ${shownCount} of ${totalCount.toLocaleString("en-IN")}`
            : ""}
        </p>
      </div>
      <div className={actionsStyle}>
        <Button variant="outline" asChild>
          <Link href="/admin/pos">
            <Store className={iconStyle} />
            New counter sale
          </Link>
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            window.location.href = "/api/admin/export?type=orders";
          }}
        >
          <Download className={iconStyle} />
          Export CSV
        </Button>
      </div>
    </div>
  );
}
