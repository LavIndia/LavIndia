"use client";

import { useState, useRef, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { ImageTile } from "@/components/admin/products/ImageTile";
import { toast } from "sonner";
import { css } from "styled-system/css";

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
  /** Blocks uploading while a prerequisite (the category) is missing. */
  disabled?: boolean;
  /**
   * Where an upload failure is reported. When given, it replaces the toast
   * so the caller can show the message somewhere the admin will not miss.
   */
  onError?: (message: string) => void;
  /**
   * Rendered beneath each image's alt text. Lets the caller add a control
   * that means something only to it — moving the image to another group —
   * without this component having to know what a group is.
   */
  renderImageFooter?: (index: number) => ReactNode;
}

export function ImageUpload({
  images,
  setImages,
  productName,
  categoryId,
  disabled = false,
  onError,
  renderImageFooter,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const uploadFiles = async (fileList: File[]) => {
    if (fileList.length === 0 || disabled) return;

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
      const message = error instanceof Error ? error.message : "Failed to upload images";
      if (onError) {
        onError(message);
        return;
      }
      toast.error(
        message,
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
    if (disabled) return;
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
          disabled={uploading || disabled}
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
            <ImageTile
              key={image.id ?? `${image.url}-${index}`}
              url={image.url}
              alt={image.alt}
              isPrimary={image.isPrimary}
              onSetPrimary={() => setPrimary(index)}
              onRemove={() => removeImage(index)}
              onAltChange={(alt) =>
                setImages(images.map((img, i) => (i === index ? { ...img, alt } : img)))
              }
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              footer={renderImageFooter?.(index)}
            />
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
