import Link from "next/link";
import { ExternalLink, PencilLine } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ContentPageSummary } from "@/modules/marketing";
import { css } from "styled-system/css";

const cardStyle = css({
  borderRadius: "lg",
  border: "1px solid",
  borderColor: "border.subtle",
  background: "bg.surface",
  overflowX: "auto",
});

const titleStyle = css({ fontWeight: "medium", color: "fg.default" });
const slugStyle = css({ fontSize: "sm", color: "fg.muted" });
const actionsStyle = css({ display: "flex", gap: "2", justifyContent: "flex-end" });
const iconStyle = css({ width: "4", height: "4", marginRight: "2" });

function formatUpdated(updatedAt: Date | null) {
  if (!updatedAt) return null;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(updatedAt);
}

export function ContentPagesTable({ pages }: { pages: ContentPageSummary[] }) {
  return (
    <div className={cardStyle}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Page</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Sections</TableHead>
            <TableHead>Last edited</TableHead>
            <TableHead className={css({ textAlign: "right" })}>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pages.map((page) => {
            const updated = formatUpdated(page.updatedAt);
            return (
              <TableRow key={page.slug}>
                <TableCell>
                  <div className={titleStyle}>{page.title}</div>
                  <div className={slugStyle}>{page.href}</div>
                </TableCell>
                <TableCell>
                  {!page.isPublished ? (
                    <Badge variant="secondary">Hidden — showing draft</Badge>
                  ) : page.isCustomised ? (
                    <Badge>Edited</Badge>
                  ) : (
                    <Badge variant="outline">Shipped draft</Badge>
                  )}
                </TableCell>
                <TableCell>{page.sectionCount}</TableCell>
                {/* No date until someone has actually saved the page: an
                    invented one would claim the draft had been reviewed. */}
                <TableCell>{updated ?? <span className={slugStyle}>Never</span>}</TableCell>
                <TableCell>
                  <div className={actionsStyle}>
                    <Link href={page.href} target="_blank" rel="noreferrer">
                      <Button variant="outline" size="sm">
                        <ExternalLink className={iconStyle} />
                        View
                      </Button>
                    </Link>
                    <Link href={`/admin/content-pages/${page.slug}`}>
                      <Button size="sm">
                        <PencilLine className={iconStyle} />
                        Edit
                      </Button>
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
