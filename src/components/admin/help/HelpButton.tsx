"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { css } from "styled-system/css";
import { helpFor } from "@/content/admin-help";
import { HelpContent } from "./HelpContent";

/**
 * The "?" in the admin top bar: help for the screen you are on, with a way
 * to the full Help page.
 */
export function HelpButton() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const search = useSearchParams();
  // A new offer opened from a template is the offer editor, not the gallery.
  const path =
    pathname === "/admin/promotions/new" && search.get("template") ? "/admin/promotions/new-offer" : pathname;
  const entry = helpFor(path);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Help for this page"
        title="Help for this page"
        onClick={() => setOpen(true)}
      >
        <HelpCircle className={css({ height: "5", width: "5" })} />
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className={css({ width: "full", maxWidth: "34rem", overflowY: "auto" })}>
          <SheetHeader>
            <SheetTitle>{entry ? entry.title : "Help"}</SheetTitle>
            <SheetDescription>
              {entry ? `${entry.area} · how this page works` : "There is no help written for this page yet."}
            </SheetDescription>
          </SheetHeader>
          <div className={css({ paddingInline: "4", paddingBottom: "8", display: "flex", flexDirection: "column", gap: "6" })}>
            {entry && <HelpContent entry={entry} />}
            <Link
              href="/admin/help"
              onClick={() => setOpen(false)}
              className={css({ fontSize: "sm", fontWeight: "medium", color: "gold.700", _dark: { color: "gold.200" } })}
            >
              Open the full help for every page →
            </Link>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
