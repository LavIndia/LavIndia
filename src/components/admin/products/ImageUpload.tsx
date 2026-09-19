"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Upload, X, Star, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { css, cx } from "styled-system/css";

const imageCardStyle = css({
  "&:hover .image-actions": { opacity: 1 },
});

const imageActionsStyle = css({
  position: "absolute",
  inset: 0,
  background: "rgba(18, 17, 16, 0.5)",
  opacity: 0,
  transition: "opacity 0.15s ease",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "2",
  borderRadius: "md",
});

interface ProductImage {
  id?: string;
  url: string;
  alt: string | null;
  isPrimary: boolean;
  position: number;
}

interface ImageUploadProps {
  /**
   * Decides which media-library folder the images are filed under, so the
   * ImageKit structure mirrors the catalog. Uploads are rejected without it.
   */
  categoryId?: string;
  images: ProductImage[];
  setImages: (images: ProductImage[]) => void;
  productName?: string;
}

export function ImageUpload({
  images,
  setImages,
  productName,
  categoryId,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const uploadFiles = async (fileList: File[]) => {
    if (fileList.length === 0) return;

    setUploading(true);

    try {
      // Uploaded in parallel — a sequential loop here was a big part of why
      // adding a product with several images felt slow.
      const results = await Promise.all(
        fileList.map(async (file) => {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("productName", productName || "");
          formData.append("categoryId", categoryId || "");

          const response = await fetch("/api/admin/products/upload", {
            method: "POST",
            body: formData,
          });
          const result = await response.json();
          if (!response.ok) {
            throw new Error(result.error || `Failed to upload ${file.name}`);
          }
          return { url: result.url as string, alt: file.name };
        }),
      );

      const uploadedImages: ProductImage[] = results.map((r, i) => ({
        url: r.url,
        alt: r.alt,
        isPrimary: images.length === 0 && i === 0,
        position: images.length + i,
      }));

      setImages([...images, ...uploadedImages]);

      toast.success(
        uploadedImages.length > 1
          ? `${uploadedImages.length} images added`
          : "Image added",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to upload images",
      );
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await uploadFiles(Array.from(files));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFiles(false);
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith("image/"),
    );
    if (files.length === 0) return;
    await uploadFiles(files);
  };

  const handleDropzoneDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes("Files")) setIsDraggingFiles(true);
  };

  const handleDropzoneDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget === e.target) setIsDraggingFiles(false);
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);

    // If we removed the primary image, make the first one primary
    if (images[index].isPrimary && newImages.length > 0) {
      newImages[0].isPrimary = true;
    }

    // Reindex positions
    setImages(newImages.map((img, i) => ({ ...img, position: i })));
  };

  const setPrimary = (index: number) => {
    setImages(
      images.map((img, i) => ({
        ...img,
        isPrimary: i === index,
      })),
    );
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newImages = [...images];
    const draggedItem = newImages[draggedIndex];
    newImages.splice(draggedIndex, 1);
    newImages.splice(index, 0, draggedItem);

    setImages(newImages.map((img, i) => ({ ...img, position: i })));
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <div
      className={css({
        display: "flex",
        flexDirection: "column",
        gap: "4",
        position: "relative",
        borderRadius: "lg",
        transition: "background 0.15s ease",
        ...(isDraggingFiles
          ? { background: "gold.50", outline: "2px dashed token(colors.gold.400)", outlineOffset: "4px" }
          : {}),
      })}
      onDragOver={handleDropzoneDragOver}
      onDragLeave={handleDropzoneDragLeave}
      onDrop={handleDrop}
    >
      {/* Upload Button */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className={css({ srOnly: true })}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <Upload className={css({ height: "4", width: "4" })} />
          {uploading ? "Uploading..." : "Upload Images"}
        </Button>
        <p className={css({ fontSize: "sm", color: "fg.muted", marginTop: "2" })}>
          Drag images anywhere in this box to upload, or click to browse. Drag a thumbnail to reorder; click the star to set the cover image.
        </p>
      </div>

      {/* Image Grid */}
      {images.length > 0 && (
        <div
          className={css({
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "4",
            md: { gridTemplateColumns: "repeat(4, 1fr)" },
          })}
        >
          {images.map((image, index) => (
            <Card
              key={index}
              className={cx(
                imageCardStyle,
                css({ position: "relative", cursor: "grab" }),
              )}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
            >
              <div className={css({ aspectRatio: "1 / 1", position: "relative" })}>
                <Image
                  src={image.url}
                  alt={image.alt || "Product image"}
                  fill
                  className={css({ objectFit: "cover", borderRadius: "md" })}
                />

                {/* Drag Handle */}
                <div
                  className={css({
                    position: "absolute",
                    top: "2",
                    left: "2",
                    background: "rgba(255,255,255,0.85)",
                    borderRadius: "md",
                    padding: "1",
                  })}
                >
                  <GripVertical className={css({ height: "4", width: "4" })} />
                </div>

                {/* Primary Badge */}
                {image.isPrimary && (
                  <div
                    className={css({
                      position: "absolute",
                      top: "2",
                      right: "2",
                      background: "linear-gradient(135deg, {colors.gold.300}, {colors.gold.500})",
                      color: "fg.onGold",
                      fontSize: "xs",
                      paddingInline: "2",
                      paddingBlock: "1",
                      borderRadius: "full",
                    })}
                  >
                    Primary
                  </div>
                )}

                {/* Actions */}
                <div className={cx("image-actions", imageActionsStyle)}>
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    onClick={() => setPrimary(index)}
                    title="Set as primary"
                  >
                    <Star
                      className={css({
                        height: "4",
                        width: "4",
                        color: image.isPrimary ? "gold.500" : "currentColor",
                        fill: image.isPrimary ? "token(colors.gold.500)" : "none",
                      })}
                    />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    onClick={() => removeImage(index)}
                    title="Remove"
                  >
                    <X className={css({ height: "4", width: "4" })} />
                  </Button>
                </div>
              </div>

              {/* Alt Text */}
              <div className={css({ padding: "2" })}>
                <Input
                  placeholder="Alt text"
                  value={image.alt || ""}
                  onChange={(e) => {
                    const newImages = [...images];
                    newImages[index].alt = e.target.value;
                    setImages(newImages);
                  }}
                  className={css({ fontSize: "xs" })}
                />
              </div>
            </Card>
          ))}
        </div>
      )}

      {images.length === 0 && (
        <div
          className={css({
            border: "2px dashed",
            borderColor: "border.subtle",
            borderRadius: "lg",
            padding: "8",
            textAlign: "center",
          })}
        >
          <Upload
            className={css({
              height: "12",
              width: "12",
              marginInline: "auto",
              color: "fg.muted",
              marginBottom: "2",
            })}
          />
          <p className={css({ color: "fg.muted" })}>No images uploaded yet</p>
        </div>
      )}
    </div>
  );
}
