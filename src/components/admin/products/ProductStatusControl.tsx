"use client";

import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { css } from "styled-system/css";

interface ProductStatusControlProps {
  product: { id: string; name: string; isPublished: boolean; retiredAt?: Date | string | null };
  onTogglePublished: () => void;
  togglingPublishedId: string | null;
}

/**
 * The Published / Draft switch for one product, with a Retired tag beside it
 * when the shop has stopped stocking the piece. Shared by the desktop row and
 * the phone card so the two can never disagree about a product's state.
 */
export function ProductStatusControl({
  product,
  onTogglePublished,
  togglingPublishedId,
}: ProductStatusControlProps) {
  return (
    <div
      className={css({ display: "flex", alignItems: "center", gap: "2", flexWrap: "wrap" })}
      onClick={(e) => e.stopPropagation()}
    >
      <Switch
        checked={product.isPublished}
        onCheckedChange={onTogglePublished}
        disabled={togglingPublishedId === product.id}
        aria-label={product.isPublished ? `Move ${product.name} to draft` : `Publish ${product.name}`}
      />
      <span className={css({ fontSize: "sm", color: product.isPublished ? "fg.default" : "fg.muted" })}>
        {product.isPublished ? "Published" : "Draft"}
      </span>
      {product.retiredAt && (
        <Badge variant="secondary" title="Never to be restocked — selling what is left">
          Retired
        </Badge>
      )}
    </div>
  );
}
