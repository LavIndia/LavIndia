"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { css } from "styled-system/css";

const wrapStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "4",
  md: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
});

const titleStyle = css({
  fontFamily: "display",
  fontSize: "2xl",
  fontWeight: "bold",
  color: "fg.default",
});

const subtitleStyle = css({
  marginTop: "1",
  fontSize: "sm",
  color: "fg.muted",
});

const iconStyle = css({ marginRight: "2", height: "4", width: "4" });

export function FiltersHeader() {
  return (
    <div className={wrapStyle}>
      <div>
        <h2 className={titleStyle}>Filters</h2>
        <p className={subtitleStyle}>
          Manage product filters like Price Range, Metal Type, Stone Type, etc.
        </p>
      </div>
      <Link href="/admin/filters/new">
        <Button>
          <Plus className={iconStyle} />
          New Filter
        </Button>
      </Link>
    </div>
  );
}
