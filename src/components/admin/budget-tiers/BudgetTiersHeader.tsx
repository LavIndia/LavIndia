"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

export function BudgetTiersHeader() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Budget Price Tiers
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage shopping budget categories
        </p>
      </div>
      <Link href="/admin/budget-tiers/new">
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Tier
        </Button>
      </Link>
    </div>
  );
}
