"use client";

import type { ReactNode } from "react";
import { css, cx } from "styled-system/css";

const cardStyle = css({
  position: "relative",
  display: "flex",
  alignItems: "center",
  gap: "3.5",
  padding: { base: "3.5", md: "4" },
  borderRadius: "lg",
  border: "1px solid",
  borderColor: "border.subtle",
  background: "bg.surface",
  cursor: "pointer",
  transition: "border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease",
  _hover: { borderColor: "accent.default" },
  "&:has(input:focus-visible)": { boxShadow: "0 0 0 3px token(colors.gold.200)" },
  "&[data-selected='true']": {
    borderColor: "accent.default",
    background: "bg.glassStrong",
    boxShadow: "glass",
  },
});

const iconWrapStyle = css({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  width: "10",
  height: "10",
  borderRadius: "full",
  border: "1px solid",
  borderColor: "border.subtle",
  color: "fg.muted",
  transition: "color 0.18s ease, border-color 0.18s ease, background 0.18s ease",
  "[data-selected='true'] &": {
    color: "accent.pressed",
    borderColor: "accent.default",
    background: "gold.50",
  },
});

const textWrapStyle = css({
  flex: "1",
  minWidth: "0",
  display: "flex",
  flexDirection: "column",
  gap: "0.5",
});
const titleStyle = css({ fontSize: "sm", fontWeight: "medium", color: "fg.default" });
const descriptionStyle = css({ fontSize: "xs", color: "fg.muted", lineHeight: "relaxed" });

const rightStyle = css({ display: "flex", alignItems: "center", gap: "3", flexShrink: 0 });
const metaStyle = css({ fontSize: "sm", fontWeight: "medium", color: "fg.default" });

/** A ring that fills in, rather than the browser's default radio dot. */
const markStyle = css({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "4.5",
  height: "4.5",
  borderRadius: "full",
  border: "1px solid",
  borderColor: "border.default",
  transition: "border-color 0.18s ease",
  "&::after": {
    content: '""',
    width: "2.5",
    height: "2.5",
    borderRadius: "full",
    background: "accent.default",
    transform: "scale(0)",
    transition: "transform 0.18s cubic-bezier(0.22,1,0.36,1)",
  },
  "[data-selected='true'] &": {
    borderColor: "accent.default",
    "&::after": { transform: "scale(1)" },
  },
});

/** The real radio, kept in the tree for keyboard and screen-reader users. */
const inputStyle = css({
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clipPath: "inset(50%)",
  whiteSpace: "nowrap",
  border: 0,
});

export interface ChoiceCardProps {
  /** Radio group this card belongs to. */
  name: string;
  value: string;
  checked: boolean;
  onSelect: () => void;
  icon: ReactNode;
  title: string;
  description?: string;
  /** A price or other short value shown on the right. */
  meta?: ReactNode;
}

/**
 * One option in a list the customer picks from — a shipping speed, a way to
 * pay.
 *
 * A native radio inside a label would do the job, but the default control is
 * a 13-pixel grey circle, which is not what this shop looks like anywhere
 * else. The input is therefore kept for behaviour and hidden visually, and
 * the whole card becomes the target: easier to hit on a phone, and it leaves
 * room for the one line of explanation that stops a customer hesitating over
 * which option to take.
 */
export function ChoiceCard({
  name,
  value,
  checked,
  onSelect,
  icon,
  title,
  description,
  meta,
}: ChoiceCardProps) {
  return (
    <label className={cx(cardStyle)} data-selected={checked}>
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onSelect}
        className={inputStyle}
      />
      <span className={iconWrapStyle} aria-hidden>
        {icon}
      </span>
      <span className={textWrapStyle}>
        <span className={titleStyle}>{title}</span>
        {/* Hidden entirely when there is nothing to say, rather than left
            as an empty line. */}
        {description && <span className={descriptionStyle}>{description}</span>}
      </span>
      <span className={rightStyle}>
        {meta && <span className={metaStyle}>{meta}</span>}
        <span className={markStyle} aria-hidden />
      </span>
    </label>
  );
}

export const choiceListStyle = css({ display: "grid", gap: "2.5" });
