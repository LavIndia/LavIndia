"use client";

import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { SectionDraft } from "@/components/admin/content-pages/content-text";
import {
  cardStyle,
  fieldStyle,
  hintStyle,
  sectionActionsStyle,
  sectionHeaderStyle,
  sectionIndexStyle,
} from "@/components/admin/content-pages/content-pages.styles";
import { css } from "styled-system/css";

export interface SectionFieldsProps {
  draft: SectionDraft;
  index: number;
  total: number;
  onChange: (id: string, patch: Partial<SectionDraft>) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onRemove: (id: string) => void;
}

const iconStyle = css({ width: "4", height: "4" });
const stackStyle = css({ display: "flex", flexDirection: "column", gap: "4" });

export function SectionFields({
  draft,
  index,
  total,
  onChange,
  onMove,
  onRemove,
}: SectionFieldsProps) {
  return (
    <div className={cardStyle}>
      <div className={sectionHeaderStyle}>
        <span className={sectionIndexStyle}>
          Section {index + 1} of {total}
        </span>
        <div className={sectionActionsStyle}>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Move section up"
            isDisabled={index === 0}
            onPress={() => onMove(draft.id, -1)}
          >
            <ArrowUp className={iconStyle} />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Move section down"
            isDisabled={index === total - 1}
            onPress={() => onMove(draft.id, 1)}
          >
            <ArrowDown className={iconStyle} />
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="icon-sm"
            aria-label="Remove section"
            isDisabled={total === 1}
            onPress={() => onRemove(draft.id)}
          >
            <Trash2 className={iconStyle} />
          </Button>
        </div>
      </div>

      <div className={stackStyle}>
        <div className={fieldStyle}>
          <Label htmlFor={`${draft.id}-heading`}>Heading</Label>
          <Input
            id={`${draft.id}-heading`}
            value={draft.heading}
            placeholder="How to start a return"
            onChange={(event) => onChange(draft.id, { heading: event.target.value })}
          />
        </div>

        <div className={fieldStyle}>
          <Label htmlFor={`${draft.id}-body`}>Paragraphs</Label>
          <Textarea
            id={`${draft.id}-body`}
            value={draft.bodyText}
            rows={6}
            placeholder={"Write a paragraph.\n\nLeave a blank line between paragraphs."}
            onChange={(event) => onChange(draft.id, { bodyText: event.target.value })}
          />
          <p className={hintStyle}>
            Separate paragraphs with a blank line. Leave empty for a section
            that is only a list.
          </p>
        </div>

        <div className={fieldStyle}>
          <Label htmlFor={`${draft.id}-bullets`}>List items</Label>
          <Textarea
            id={`${draft.id}-bullets`}
            value={draft.bulletsText}
            rows={5}
            placeholder={"One item per line.\nAnother item."}
            onChange={(event) => onChange(draft.id, { bulletsText: event.target.value })}
          />
          <p className={hintStyle}>
            One item per line. Leave empty for a section with no list.
          </p>
        </div>
      </div>
    </div>
  );
}
