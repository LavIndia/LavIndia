"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export function AnalyticsHeader() {
  const handleExport = () => {
    window.location.href = "/api/admin/export?type=analytics";
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground mt-2">
          Track your business performance and insights
        </p>
      </div>
      <Button variant="outline" onClick={handleExport}>
        <Download className="h-4 w-4 mr-2" />
        Export Report
      </Button>
    </div>
  );
}
