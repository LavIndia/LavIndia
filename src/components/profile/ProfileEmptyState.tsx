"use client";

import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { emptyStateStyle } from "@/components/profile/profile.styles";
import { css } from "styled-system/css";

/**
 * The "nothing here yet" panel the account tabs share.
 *
 * Four tabs needed the same block, and writing it four times is how they end
 * up looking subtly different from one another. The description and the
 * action are both optional, so a tab that has nothing more to say shows
 * nothing more rather than a placeholder line.
 */

const iconStyle = css({ marginInline: "auto", h: "12", w: "12", color: "fg.muted" });
const titleStyle = css({
  marginTop: "4",
  fontSize: "lg",
  fontWeight: "medium",
  color: "fg.default",
});
const descriptionStyle = css({ marginTop: "2", fontSize: "sm", color: "fg.muted" });

export interface ProfileEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function ProfileEmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: ProfileEmptyStateProps) {
  return (
    <Card>
      <CardContent className={emptyStateStyle}>
        <Icon className={iconStyle} />
        <h3 className={titleStyle}>{title}</h3>
        {description ? <p className={descriptionStyle}>{description}</p> : null}
        {actionLabel && onAction ? (
          <Button className={css({ marginTop: "4" })} onClick={onAction}>
            {actionLabel}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
