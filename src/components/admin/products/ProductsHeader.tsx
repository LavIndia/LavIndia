"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { Download, MoreHorizontal, Plus, Upload } from "lucide-react";
import { css } from "styled-system/css";

/**
 * The Products screen's title and its three actions.
 *
 * Adding a product is the one an admin comes here to do, so it keeps its
 * button at every width. Exporting and bulk uploading are occasional, and on
 * a phone three side-by-side buttons wrapped onto a second and third row, so
 * below `md` those two fold into a single overflow button instead.
 */

const iconStyle = css({ height: "4", width: "4" });
const wideOnlyStyle = css({ display: { base: "none", md: "inline-flex" } });
const phoneOnlyStyle = css({ display: { base: "inline-flex", md: "none" } });
const addLabelStyle = css({ display: { base: "none", sm: "inline" } });

export function ProductsHeader() {
  const handleExport = () => {
    window.location.href = "/api/admin/export?type=products";
  };

  return (
    <AdminPageHeader
      title="Products"
      subtitle="Manage your product catalog"
      actions={
        <>
          <Button variant="outline" size="sm" onClick={handleExport} className={wideOnlyStyle}>
            <Download className={iconStyle} />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" asChild className={wideOnlyStyle}>
            <Link href="/admin/products/bulk-upload">
              <Upload className={iconStyle} />
              Bulk Upload
            </Link>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className={phoneOnlyStyle}
                aria-label="More product actions"
              >
                <MoreHorizontal className={iconStyle} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExport}>
                <Download className={css({ marginRight: "2", height: "4", width: "4" })} />
                Export CSV
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/admin/products/bulk-upload">
                  <Upload className={css({ marginRight: "2", height: "4", width: "4" })} />
                  Bulk Upload
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button size="sm" asChild>
            <Link href="/admin/products/new">
              <Plus className={iconStyle} />
              <span className={addLabelStyle}>Add Product</span>
            </Link>
          </Button>
        </>
      }
    />
  );
}
