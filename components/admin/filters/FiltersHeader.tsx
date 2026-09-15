"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export function FiltersHeader() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Filters</h2>
        <p className="mt-1 text-sm text-gray-600">
          Manage product filters like Price Range, Metal Type, Stone Type, etc.
        </p>
      </div>
      <Link href="/admin/filters/new">
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Filter
        </Button>
      </Link>
    </div>
  );
}
