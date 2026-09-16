"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
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

const subtitleStyle = css({
  marginTop: "2",
  fontSize: "sm",
  color: "fg.muted",
});

export function CustomersHeader() {
  const handleExport = () => {
    window.location.href = "/api/admin/export?type=customers";
  };

  return (
    <div className={headerRowStyle}>
      <div>
        <h1 className={titleStyle}>Customers</h1>
        <p className={subtitleStyle}>View and manage customer information</p>
      </div>
      <Button variant="outline" onClick={handleExport}>
        <Download className={css({ height: "4", width: "4" })} />
        Export CSV
      </Button>
    </div>
  );
}
