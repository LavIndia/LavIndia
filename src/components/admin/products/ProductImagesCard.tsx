"use client";

import { useState } from "react";
import { FolderOpen } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageUpload } from "@/components/admin/products/ImageUpload";
import { availableGroups, sameGroup, type ImageGroup } from "@/modules/catalog/client";
import {
  groupKey,
  groupLabel,
  toGroupedImage,
} from "@/components/admin/products/product-form-images";
import type {
  GalleryImage,
  ProductImage,
  ProductVariant,
} from "@/components/admin/products/product-form-types";
import {
  groupTabActiveStyle,
  groupTabCountStyle,
  groupTabStyle,
  groupTabsStyle,
} from "@/components/admin/products/product-form.styles";
import { css, cx } from "styled-system/css";

/**
 * The product's images, filed by option value.
 *
 * "All variants" holds the photographs every variant shows. Each option value
 * the product comes in — Gold, Silver, Sterling Silver — has its own set,
 * shown for any variant with that value, whatever its other options. A
 * product sold as a single item has only the first tab. An image can be
 * moved between sets, so nothing has to be uploaded twice.
 *
 * Uploads are filed under the category's folder so the media library mirrors
 * the catalog, which means the category has to be chosen first; the card
 * says so up front rather than letting the upload fail.
 */

const alertActionsStyle = css({ marginTop: "3" });
const moveTriggerStyle = css({ height: "8", fontSize: "xs" });

export interface ProductImagesCardProps {
  images: ProductImage[];
  variants: ProductVariant[];
  imagesInGroup: (group: ImageGroup | null) => GalleryImage[];
  setImagesInGroup: (group: ImageGroup | null, images: GalleryImage[]) => void;
  moveImage: (from: ImageGroup | null, index: number, to: ImageGroup | null) => void;
  productName: string;
  categoryId: string;
  onError: (message: string) => void;
}

function focusCategory() {
  const trigger = document.getElementById("category");
  trigger?.scrollIntoView({ block: "center", behavior: "smooth" });
  trigger?.focus();
}

export function ProductImagesCard({
  images,
  variants,
  imagesInGroup,
  setImagesInGroup,
  moveImage,
  productName,
  categoryId,
  onError,
}: ProductImagesCardProps) {
  const needsCategory = !categoryId;
  const groups = availableGroups(variants, images.map(toGroupedImage));
  const tabs: (ImageGroup | null)[] = [null, ...groups];

  const [active, setActive] = useState<ImageGroup | null>(null);
  // A group can disappear when its last variant goes; fall back to "All".
  const current = tabs.some((t) => sameGroup(t, active)) ? active : null;
  const others = tabs.filter((t) => !sameGroup(t, current));

  const countFor = (group: ImageGroup | null) =>
    images.filter((img) => sameGroup(img.group, group)).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Images</CardTitle>
        <CardDescription>
          {groups.length > 0
            ? "Photographs under All variants show for every variant. Photographs under an option value show for any variant with that value — the Gold set for every Gold variant, whatever its size."
            : "The starred image is the cover on the storefront. Once the product has option values, each one gets its own set of photographs here."}
        </CardDescription>
      </CardHeader>
      <CardContent className={css({ display: "flex", flexDirection: "column", gap: "4" })}>
        {needsCategory ? (
          <Alert>
            <FolderOpen className={css({ height: "4", width: "4" })} />
            <AlertTitle>Choose a category before adding images</AlertTitle>
            <AlertDescription>
              Images are filed under the category&rsquo;s folder in the media
              library, so the category has to be set first.
              <div className={alertActionsStyle}>
                <Button type="button" variant="outline" size="sm" onPress={focusCategory}>
                  Go to category
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        ) : null}

        {groups.length > 0 ? (
          <div className={groupTabsStyle} role="tablist" aria-label="Image sets">
            {tabs.map((group) => {
              const selected = sameGroup(group, current);
              return (
                <button
                  key={groupKey(group)}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  className={cx(groupTabStyle, selected && groupTabActiveStyle)}
                  onClick={() => setActive(group)}
                >
                  {groupLabel(group)}
                  <span className={groupTabCountStyle}>{countFor(group)}</span>
                </button>
              );
            })}
          </div>
        ) : null}

        <ImageUpload
          key={groupKey(current)}
          images={imagesInGroup(current)}
          setImages={(updated) => setImagesInGroup(current, updated)}
          productName={productName}
          categoryId={categoryId}
          disabled={needsCategory}
          onError={onError}
          renderImageFooter={
            others.length > 0
              ? (index) => (
                  <Select
                    value=""
                    onValueChange={(key) => {
                      const target = others.find((g) => groupKey(g) === key);
                      if (target !== undefined) moveImage(current, index, target);
                    }}
                  >
                    <SelectTrigger className={moveTriggerStyle} aria-label="Move image to another set">
                      <SelectValue placeholder="Move to…" />
                    </SelectTrigger>
                    <SelectContent>
                      {others.map((group) => (
                        <SelectItem key={groupKey(group)} value={groupKey(group)}>
                          {groupLabel(group)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )
              : undefined
          }
        />
      </CardContent>
    </Card>
  );
}
