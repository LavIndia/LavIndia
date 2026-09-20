"use client";

import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  actionBarButtonsStyle,
  actionBarStyle,
} from "@/components/admin/products/product-form.styles";
import { css } from "styled-system/css";

/** The sticky bar carrying the product's name, its state, and the save actions. */

const titleRowStyle = css({
  display: "flex",
  alignItems: "center",
  gap: "3",
  minWidth: "0",
});

const titleStyle = css({
  fontWeight: "medium",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

const spinnerStyle = css({ height: "4", width: "4", animation: "spin" });

export interface ProductFormActionBarProps {
  name: string;
  isPublished: boolean;
  isExistingProduct: boolean;
  loading: boolean;
  savingAction: "draft" | "publish" | null;
  onCancel: () => void;
  onSave: (publish: boolean) => void;
}

export function ProductFormActionBar({
  name,
  isPublished,
  isExistingProduct,
  loading,
  savingAction,
  onCancel,
  onSave,
}: ProductFormActionBarProps) {
  return (
    <div className={actionBarStyle}>
      <div className={titleRowStyle}>
        <p className={titleStyle}>
          {name || (isExistingProduct ? "Edit product" : "New product")}
        </p>
        <Badge variant={isPublished ? "default" : "secondary"}>
          {isPublished ? "Published" : "Draft"}
        </Badge>
      </div>
      <div className={actionBarButtonsStyle}>
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => onSave(false)}
          disabled={loading}
        >
          {loading && savingAction === "draft" && <Loader2 className={spinnerStyle} />}
          Save Draft
        </Button>
        <Button type="button" onClick={() => onSave(true)} disabled={loading}>
          {loading && savingAction === "publish" && <Loader2 className={spinnerStyle} />}
          {isPublished ? "Save & Publish" : "Publish"}
        </Button>
      </div>
    </div>
  );
}
