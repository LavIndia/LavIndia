"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { css } from "styled-system/css";

const rowStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "4",
  md: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
});

const titleStyle = css({
  fontFamily: "display",
  fontSize: "2xl",
  fontWeight: "bold",
  letterSpacing: "tight",
  color: "fg.default",
  md: { fontSize: "3xl" },
});

const subtitleStyle = css({
  fontSize: "sm",
  color: "fg.muted",
  marginTop: "2",
});

export function BudgetTiersHeader() {
  return (
    <div className={rowStyle}>
      <div>
        <h1 className={titleStyle}>Budget Price Tiers</h1>
        <p className={subtitleStyle}>Manage shopping budget categories</p>
      </div>
      <Link href="/admin/budget-tiers/new">
        <Button>
          <Plus className={css({ height: "4", width: "4" })} />
          Add Tier
        </Button>
      </Link>
    </div>
  );
}
