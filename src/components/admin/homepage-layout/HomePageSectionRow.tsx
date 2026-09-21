"use client";

import Link from "next/link";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { homePageSectionDescriptor } from "@/modules/marketing/client";
import { css, cx } from "styled-system/css";
import type { EditableSection } from "@/components/admin/homepage-layout/homepage-layout-types";

/**
 * One band of the homepage, as the admin sees it.
 *
 * The stored key (`new_arrivals`) is never shown on its own: an admin is
 * given the name the band goes by, a sentence saying what fills it, how many
 * items are in it right now, and a link to the screen that changes that.
 * Without those, the only way to learn what a row did was to toggle it off
 * and reload the storefront.
 */

const arrowColStyle = css({ display: "flex", alignItems: "center", gap: "2" });
const arrowStackStyle = css({ display: "flex", flexDirection: "column", gap: "0.5" });
const iconStyle = css({ width: "3.5", height: "3.5" });
const labelStyle = css({ fontWeight: "medium", color: "fg.default" });
const sourceStyle = css({ fontSize: "xs", color: "fg.muted", marginTop: "0.5", maxWidth: "26rem" });
const manageStyle = css({
  display: "inline-flex",
  alignItems: "center",
  gap: "1",
  fontSize: "xs",
  fontWeight: "medium",
  color: "accent.pressed",
  marginTop: "1",
  "&:hover": { color: "accent.default" },
});
const visibilityCellStyle = css({ display: "flex", alignItems: "center", gap: "2" });
const countRowStyle = css({ display: "flex", alignItems: "center", gap: "2", flexWrap: "wrap" });

export interface HomePageSectionRowProps {
  section: EditableSection;
  /** How many items the band would render right now, if it is countable. */
  count?: { value: number; noun: string; nounPlural: string };
  isFirst: boolean;
  isLast: boolean;
  onMove: (id: string, direction: "up" | "down") => void;
  onChange: (
    id: string,
    field: keyof EditableSection,
    value: boolean | number | string,
  ) => void;
}

export function HomePageSectionRow({
  section,
  count,
  isFirst,
  isLast,
  onMove,
  onChange,
}: HomePageSectionRowProps) {
  const descriptor = homePageSectionDescriptor(section.name);
  // An empty band renders its own "nothing here yet" state, which is worth
  // warning about before an admin wonders why the homepage looks short.
  const isEmpty = count !== undefined && count.value === 0;

  return (
    <TableRow
      className={cx(!section.isVisible && css({ background: "bg.canvas", opacity: 0.7 }))}
    >
      <TableCell>
        <div className={arrowColStyle}>
          <div className={arrowStackStyle}>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() => onMove(section.id, "up")}
              disabled={isFirst}
              aria-label={`Move ${descriptor.label} up`}
            >
              <ChevronUp className={iconStyle} />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() => onMove(section.id, "down")}
              disabled={isLast}
              aria-label={`Move ${descriptor.label} down`}
            >
              <ChevronDown className={iconStyle} />
            </Button>
          </div>
          <Input
            type="number"
            value={section.order}
            onChange={(e) => onChange(section.id, "order", parseInt(e.target.value) || 0)}
            className={css({ width: "16" })}
            aria-label={`Position of ${descriptor.label}`}
          />
        </div>
      </TableCell>

      <TableCell>
        <div className={countRowStyle}>
          <span className={labelStyle}>{descriptor.label}</span>
          {count !== undefined && (
            <Badge variant={isEmpty ? "destructive" : "secondary"}>
              {count.value} {count.value === 1 ? count.noun : count.nounPlural}
            </Badge>
          )}
        </div>
        <p className={sourceStyle}>{descriptor.source}</p>
        {descriptor.managedAt && (
          <Link href={descriptor.managedAt} className={manageStyle}>
            Manage what it shows
            <ExternalLink className={css({ width: "3", height: "3" })} />
          </Link>
        )}
      </TableCell>

      <TableCell>
        <Input
          value={section.title || ""}
          onChange={(e) => onChange(section.id, "title", e.target.value)}
          placeholder={descriptor.defaultTitle}
          aria-label={`Custom title for ${descriptor.label}`}
        />
      </TableCell>

      <TableCell>
        <div className={visibilityCellStyle}>
          <Switch
            checked={section.isVisible}
            onCheckedChange={(checked) => onChange(section.id, "isVisible", checked)}
            aria-label={`Toggle visibility for ${descriptor.label}`}
          />
          <Badge variant={section.isVisible ? "default" : "secondary"}>
            {section.isVisible ? "Visible" : "Hidden"}
          </Badge>
        </div>
      </TableCell>
    </TableRow>
  );
}
