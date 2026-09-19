"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { css } from "styled-system/css";

/**
 * Pager shared by the admin list screens. Reports the range in words rather
 * than only page numbers, because "showing 26-50 of 312" is what an owner
 * actually wants to know.
 */
const rowStyle = css({
  display: "flex",
  flexDirection: { base: "column", sm: "row" },
  alignItems: { base: "stretch", sm: "center" },
  justifyContent: "space-between",
  gap: "3",
  paddingTop: "4",
});

const rangeStyle = css({ fontSize: "sm", color: "fg.muted" });
const controlsStyle = css({ display: "flex", alignItems: "center", gap: "2" });
const pageLabelStyle = css({ fontSize: "sm", color: "fg.muted", paddingInline: "2" });

export function AdminPagination({
  page,
  pageSize,
  totalCount,
  totalPages,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  // A single page of results needs no controls at all.
  if (totalCount === 0) return null;

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, totalCount);

  return (
    <div className={rowStyle}>
      <p className={rangeStyle}>
        Showing {first.toLocaleString("en-IN")}–{last.toLocaleString("en-IN")} of{" "}
        {totalCount.toLocaleString("en-IN")}
      </p>

      {totalPages > 1 && (
        <div className={controlsStyle}>
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft className={css({ height: "4", width: "4" })} />
            Previous
          </Button>
          <span className={pageLabelStyle}>
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Next
            <ChevronRight className={css({ height: "4", width: "4" })} />
          </Button>
        </div>
      )}
    </div>
  );
}
