"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, Download, Upload } from "lucide-react";
import { css } from "styled-system/css";

const headerStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "4",
  md: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
});

const titleStyle = css({
  fontFamily: "display",
  fontSize: { base: "2xl", md: "3xl" },
  fontWeight: "bold",
  letterSpacing: "tight",
  color: "fg.default",
});

const subtitleStyle = css({
  color: "fg.muted",
  marginTop: "2",
  fontSize: "sm",
});

const actionsStyle = css({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "3",
});

export function ProductsHeader() {
  const handleExport = () => {
    window.location.href = "/api/admin/export?type=products";
  };

  return (
    <div className={headerStyle}>
      <div>
        <h1 className={titleStyle}>Products</h1>
        <p className={subtitleStyle}>Manage your product catalog</p>
      </div>
      <div className={actionsStyle}>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className={css({ height: "4", width: "4" })} />
          Export CSV
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/products/bulk-upload">
            <Upload className={css({ height: "4", width: "4" })} />
            Bulk Upload
          </Link>
        </Button>
        <Button size="sm" asChild>
          <Link href="/admin/products/new">
            <Plus className={css({ height: "4", width: "4" })} />
            Add Product
          </Link>
        </Button>
      </div>
    </div>
  );
}
