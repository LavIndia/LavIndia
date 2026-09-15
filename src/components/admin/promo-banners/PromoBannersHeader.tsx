"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

export function PromoBannersHeader() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Promotional Banners
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage top scroll messages, free gifts, and special offers
        </p>
      </div>
      <Link href="/admin/promo-banners/new">
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Banner
        </Button>
      </Link>
    </div>
  );
}
