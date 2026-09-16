"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { css } from "styled-system/css";

export function DiscountsHeader() {
  return (
    <div
      className={css({
        display: "flex",
        flexDirection: "column",
        gap: "4",
        sm: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
      })}
    >
      <div>
        <h1
          className={css({
            fontFamily: "display",
            fontSize: "3xl",
            fontWeight: "bold",
            letterSpacing: "tight",
            color: "fg.default",
          })}
        >
          Discount Coupons
        </h1>
        <p className={css({ color: "fg.muted", marginTop: "2" })}>
          Manage discount codes and promotional offers
        </p>
      </div>
      <Link href="/admin/discounts/new">
        <Button>
          <Plus className={css({ marginRight: "2", width: "4", height: "4" })} />
          Create Coupon
        </Button>
      </Link>
    </div>
  );
}
