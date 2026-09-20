"use client";

import { useState } from "react";
import { groupOf, sameGroup, type ImageGroup } from "@/modules/catalog/client";
import type {
  GalleryImage,
  ProductImage,
  StoredProductImage,
} from "@/components/admin/products/product-form-types";

/**
 * The product's images while they are being edited, grouped by option value.
 *
 * Apart from the rest of the form because image grouping has rules of its
 * own: which set an image belongs to, moving one between sets without
 * re-uploading, and the fact that a primary image only means anything in the
 * general set.
 */
export function useProductImages(initial: StoredProductImage[] | undefined) {
  const [images, setImages] = useState<ProductImage[]>(() =>
    (initial ?? []).map(({ optionDimension, optionValue, ...img }) => ({
      ...img,
      group: groupOf({ ...img, optionDimension, optionValue }),
    })),
  );

  /** The images filed under one group, as the gallery editor works on them. */
  const imagesInGroup = (group: ImageGroup | null): GalleryImage[] =>
    images
      .filter((img) => sameGroup(img.group, group))
      .map(({ group: _group, ...img }) => img);

  /**
   * Replaces one group's images with the editor's version of them and keeps
   * every other group as it was. Positions are per group; the save payload
   * renumbers across the whole list.
   */
  const setImagesInGroup = (group: ImageGroup | null, updated: GalleryImage[]) =>
    setImages((current) => [
      ...current.filter((img) => !sameGroup(img.group, group)),
      ...updated.map((img) => ({ ...img, group })),
    ]);

  /**
   * Moves one image from a set to another, keeping it at the end of its new
   * set. Nothing is uploaded twice: the Gold photograph that arrived under
   * All variants is simply refiled under Gold.
   */
  const moveImage = (from: ImageGroup | null, index: number, to: ImageGroup | null) =>
    setImages((current) => {
      const moving = current.filter((img) => sameGroup(img.group, from))[index];
      if (!moving || sameGroup(from, to)) return current;

      const rest = current.filter((img) => img !== moving);
      const position = rest.filter((img) => sameGroup(img.group, to)).length;
      return [
        ...rest,
        // A primary flag is meaningful only within the general set.
        { ...moving, group: to, position, isPrimary: to === null && moving.isPrimary },
      ];
    });

  return { images, imagesInGroup, setImagesInGroup, moveImage };
}
