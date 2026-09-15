"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

export function HeroBannersHeader() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Hero Banners</h1>
        <p className="text-muted-foreground mt-2">
          Manage carousel banners on the homepage
        </p>
      </div>
      <Link href="/admin/hero-banners/new">
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Banner
        </Button>
      </Link>
    </div>
  );
}
