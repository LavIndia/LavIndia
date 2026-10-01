"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { css } from "styled-system/css";
import {
  OVERRIDE_REASONS,
  OVERRIDE_REASON_MAX,
  composeOverrideReason,
  isCompleteOverrideReason,
  parseOverrideReason,
} from "@/modules/pos/override-reasons";

const rowStyle = css({
  display: "flex",
  flexDirection: { base: "column", sm: "row" },
  alignItems: { base: "stretch", sm: "center" },
  gap: "2",
  paddingTop: "2",
  borderTop: "1px solid",
  borderColor: "border.subtle",
});
const selectStyle = css({ width: { base: "full", sm: "13rem" }, flexShrink: 0 });
const noteStyle = css({ flex: "1", minWidth: "0" });
const needStyle = css({ fontSize: "xs", color: "red.600", fontWeight: "medium" });

/**
 * Why this line's price was changed — required before the bill can be raised.
 *
 * A short curated list, so concessions can be totalled by reason later;
 * "Other" asks for a note, because "Other" alone explains nothing.
 */
export function PosOverrideReason({
  productName,
  reason,
  onChange,
}: {
  productName: string;
  reason: string | undefined;
  onChange: (reason: string | undefined) => void;
}) {
  const { choice, note } = parseOverrideReason(reason);
  const complete = isCompleteOverrideReason(reason);

  return (
    <div className={rowStyle}>
      <Select
        value={choice || undefined}
        onValueChange={(next) => onChange(next ? composeOverrideReason(next, note) : undefined)}
        className={selectStyle}
        isRequired
        aria-label={`Reason for the price change on ${productName}`}
      >
        <SelectTrigger>
          <SelectValue placeholder="Why the price changed" />
        </SelectTrigger>
        <SelectContent>
          {OVERRIDE_REASONS.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {choice === "Other" && (
        <Input
          className={noteStyle}
          value={note}
          maxLength={OVERRIDE_REASON_MAX - 10}
          onChange={(event) => onChange(composeOverrideReason("Other", event.target.value))}
          placeholder="Say what it was"
          aria-label="Reason for the price change, in your words"
          autoFocus
        />
      )}

      {!complete && (
        <span className={needStyle}>
          {choice === "Other" ? "Add a note to continue" : "Choose a reason to continue"}
        </span>
      )}
    </div>
  );
}
