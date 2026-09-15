"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Upload, X, Star, GripVertical } from "lucide-react";
import { toast } from "sonner";

interface ProductImage {
  id?: string;
  url: string;
  alt: string | null;
  isPrimary: boolean;
  position: number;
}

interface ImageUploadProps {
  images: ProductImage[];
  setImages: (images: ProductImage[]) => void;
  productName?: string;
}

export function ImageUpload({
  images,
  setImages,
  productName,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      const uploadedImages: ProductImage[] = [];
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("productName", productName || "");

        const response = await fetch("/api/admin/products/upload", {
          method: "POST",
          body: formData,
        });
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || "Failed to upload image");
        }

        uploadedImages.push({
          url: result.url,
          alt: file.name,
          isPrimary: images.length === 0 && uploadedImages.length === 0,
          position: images.length + uploadedImages.length,
        });
      }

      setImages([...images, ...uploadedImages]);

      toast.success("Images added");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to upload images",
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
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
    <div className="space-y-4">
      {/* Upload Button */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <Upload className="h-4 w-4 mr-2" />
          {uploading ? "Uploading..." : "Upload Images"}
        </Button>
        <p className="text-sm text-muted-foreground mt-2">
          Upload product images. Drag to reorder. Click star to set as primary.
        </p>
      </div>

      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {images.map((image, index) => (
            <Card
              key={index}
              className="relative group cursor-move"
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
            >
              <div className="aspect-square relative">
                <Image
                  src={image.url}
                  alt={image.alt || "Product image"}
                  fill
                  className="object-cover rounded"
                />

                {/* Drag Handle */}
                <div className="absolute top-2 left-2 bg-white/80 rounded p-1">
                  <GripVertical className="h-4 w-4" />
                </div>

                {/* Primary Badge */}
                {image.isPrimary && (
                  <div className="absolute top-2 right-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded">
                    Primary
                  </div>
                )}

                {/* Actions */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    onClick={() => setPrimary(index)}
                    title="Set as primary"
                  >
                    <Star
                      className={`h-4 w-4 ${
                        image.isPrimary ? "fill-yellow-500 text-yellow-500" : ""
                      }`}
                    />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    onClick={() => removeImage(index)}
                    title="Remove"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Alt Text */}
              <div className="p-2">
                <Input
                  placeholder="Alt text"
                  value={image.alt || ""}
                  onChange={(e) => {
                    const newImages = [...images];
                    newImages[index].alt = e.target.value;
                    setImages(newImages);
                  }}
                  className="text-xs"
                />
              </div>
            </Card>
          ))}
        </div>
      )}

      {images.length === 0 && (
        <div className="border-2 border-dashed rounded-lg p-8 text-center">
          <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No images uploaded yet</p>
        </div>
      )}
    </div>
  );
}
