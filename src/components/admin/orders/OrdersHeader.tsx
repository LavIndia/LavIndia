"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export function OrdersHeader() {
  const handleExport = () => {
    window.location.href = "/api/admin/export?type=orders";
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
        <p className="text-muted-foreground mt-2">
          Manage customer orders and update status
        </p>
      </div>
      <Button variant="outline" onClick={handleExport}>
        <Download className="h-4 w-4 mr-2" />
        Export CSV
      </Button>
    </div>
  );
}
