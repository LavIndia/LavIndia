"use client";

import { CheckCircle2, Circle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type {
  ChecklistItem,
  ProductFormData,
} from "@/components/admin/products/product-form-types";
import {
  checklistDoneStyle,
  checklistItemStyle,
  checklistPendingStyle,
  sidebarColumnStyle,
} from "@/components/admin/products/product-form.styles";
import { css, cx } from "styled-system/css";

/**
 * The publish checklist and the product's visibility switches.
 *
 * The checklist exists so an admin is told what is missing before they press
 * Publish, rather than after.
 */

const checklistContentStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "1.5",
});
const statusContentStyle = css({ display: "flex", flexDirection: "column", gap: "4" });
const statusRowStyle = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "4",
});
const statusLabelStyle = css({ display: "flex", flexDirection: "column", gap: "0.5" });
const statusHintStyle = css({ fontSize: "xs", color: "fg.muted" });
const cardTitleStyle = css({ fontSize: "md" });
const iconStyle = css({ height: "4", width: "4", flexShrink: 0 });
const doneIconStyle = css({ height: "4", width: "4", color: "success", flexShrink: 0 });

export interface ProductStatusSidebarProps {
  checklist: ChecklistItem[];
  readyToPublish: boolean;
  formData: ProductFormData;
  onChange: (field: string, value: string | boolean) => void;
}

export function ProductStatusSidebar({
  checklist,
  readyToPublish,
  formData,
  onChange,
}: ProductStatusSidebarProps) {
  return (
    <div className={sidebarColumnStyle}>
      <Card>
        <CardHeader>
          <CardTitle className={cardTitleStyle}>
            {readyToPublish ? "Ready to publish" : "Before you publish"}
          </CardTitle>
        </CardHeader>
        <CardContent className={checklistContentStyle}>
          {checklist.map((item) => (
            <div
              key={item.label}
              className={cx(
                checklistItemStyle,
                item.done ? checklistDoneStyle : checklistPendingStyle,
              )}
            >
              {item.done ? (
                <CheckCircle2 className={doneIconStyle} />
              ) : (
                <Circle className={iconStyle} />
              )}
              {item.label}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className={cardTitleStyle}>Status</CardTitle>
        </CardHeader>
        <CardContent className={statusContentStyle}>
          <div className={statusRowStyle}>
            <div className={statusLabelStyle}>
              <Label>Visibility</Label>
              <p className={statusHintStyle}>
                {formData.isPublished
                  ? "Live on the storefront"
                  : "Use Publish above to make it live"}
              </p>
            </div>
            <Badge variant={formData.isPublished ? "default" : "secondary"}>
              {formData.isPublished ? "Published" : "Draft"}
            </Badge>
          </div>

          <div className={statusRowStyle}>
            <div className={statusLabelStyle}>
              <Label htmlFor="featured">Featured</Label>
              <p className={statusHintStyle}>Shown in featured sections</p>
            </div>
            <Switch
              id="featured"
              checked={formData.isFeatured}
              onCheckedChange={(checked) => onChange("isFeatured", checked)}
            />
          </div>

          <div className={statusRowStyle}>
            <div className={statusLabelStyle}>
              <Label htmlFor="limited-edition">Limited Edition</Label>
              <p className={statusHintStyle}>
                Tags the product card as an exclusive, limited run
              </p>
            </div>
            <Switch
              id="limited-edition"
              checked={formData.isLimitedEdition}
              onCheckedChange={(checked) => onChange("isLimitedEdition", checked)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
