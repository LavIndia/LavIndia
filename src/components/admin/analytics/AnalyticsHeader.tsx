"use client";

import { css } from "styled-system/css";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export function AnalyticsHeader() {
  const handleExport = () => {
    window.location.href = "/api/admin/export?type=analytics";
  };

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
          Analytics
        </h1>
        <p className={css({ color: "fg.muted", marginTop: "2", fontSize: "sm" })}>
          Track your business performance and insights
        </p>
      </div>
      <Button variant="outline" onClick={handleExport}>
        <Download className={css({ height: "4", width: "4" })} />
        Export Report
      </Button>
    </div>
  );
}
