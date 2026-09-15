"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

export function DiscountsHeader() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Discount Coupons</h1>
        <p className="text-muted-foreground mt-2">
          Manage discount codes and promotional offers
        </p>
      </div>
      <Link href="/admin/discounts/new">
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Coupon
        </Button>
      </Link>
    </div>
  );
}
