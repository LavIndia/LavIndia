"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ImageIcon, Images, Info, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { css, cx } from "styled-system/css";

type AuthImage = {
  filename: string;
  publicPath: string;
};

export function AuthImagesManager() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<AuthImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingPath, setDeletingPath] = useState<string | null>(null);

  const loadImages = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/auth-images");
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to load images");
      }
      setImages(result.images || []);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load images",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadImages();
  }, []);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const uploadData = new FormData();
      uploadData.append("file", file);
      const response = await fetch("/api/admin/auth-images/upload", {
        method: "POST",
        body: uploadData,
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to upload image");
      }

      toast.success("Image uploaded");
      await loadImages();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to upload image",
      );
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (image: AuthImage) => {
    if (
      !confirm(
        `Remove "${image.filename}" from the login screen carousel?`,
      )
    ) {
      return;
    }

    setDeletingPath(image.publicPath);
    try {
      const response = await fetch("/api/admin/auth-images", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: image.filename }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || "Failed to delete image");
      }

      toast.success("Image removed");
      setImages((current) =>
        current.filter((item) => item.publicPath !== image.publicPath),
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete image",
      );
    } finally {
      setDeletingPath(null);
    }
  };

  return (
    <div className={css({ display: "flex", flexDirection: "column", gap: "6" })}>
      <div
        className={css({
          display: "flex",
          flexDirection: "column",
          gap: "4",
          sm: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
        })}
      >
        <div>
          <h1
            className={css({
              fontFamily: "display",
              fontSize: "3xl",
              fontWeight: "bold",
              letterSpacing: "tight",
              color: "fg.default",
            })}
          >
            Login Screen Images
          </h1>
          <p className={css({ color: "fg.muted", marginTop: "2" })}>
            Manage the rotating carousel shown on the login and signup screen
          </p>
        </div>
        <input
          ref={fileInputRef}
          id="auth-image-upload"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleUpload}
          className={css({ display: "none" })}
        />
        <Button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          <Upload className={css({ marginRight: "2", width: "4", height: "4" })} />
          {isUploading ? "Uploading..." : "Add Image"}
        </Button>
      </div>

      <div
        className={css({
          display: "flex",
          alignItems: "center",
          gap: "3",
          borderRadius: "xl",
          border: "1px solid",
          borderColor: "border.subtle",
          background: "bg.surface",
          paddingInline: "4",
          paddingBlock: "3",
          boxShadow: "card",
        })}
      >
        <Images className={css({ width: "4", height: "4", color: "fg.muted", flexShrink: 0 })} />
        <span className={css({ fontSize: "sm", fontWeight: "medium" })}>
          {isLoading
            ? "Loading images..."
            : `${images.length} image${images.length === 1 ? "" : "s"} in rotation`}
        </span>
        <span
          className={css({
            display: "flex",
            alignItems: "center",
            gap: "1.5",
            fontSize: "xs",
            color: "fg.muted",
            marginLeft: "auto",
          })}
        >
          <Info className={css({ width: "3.5", height: "3.5" })} />
          These images appear on the left panel of the login / signup dialog
        </span>
      </div>

      {isLoading ? (
        <div
          className={css({
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            paddingBlock: "16",
            color: "fg.muted",
          })}
        >
          Loading images&hellip;
        </div>
      ) : images.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className={css({ fontSize: "lg" })}>No images yet</CardTitle>
            <CardDescription>
              Upload at least one image so the login screen carousel has
              something to show.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <button
              type="button"
              className={css({
                display: "flex",
                aspectRatio: "16 / 6",
                width: "full",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "2",
                borderRadius: "md",
                border: "1px dashed",
                borderColor: "border.subtle",
                color: "fg.muted",
                cursor: "pointer",
                transition: "border-color 0.15s ease, color 0.15s ease",
                "&:hover": { borderColor: "accent.default", color: "accent.pressed" },
                "&:disabled": { cursor: "not-allowed", opacity: 0.6 },
              })}
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <div
                className={css({
                  borderRadius: "full",
                  background: "gold.100",
                  padding: "3",
                  color: "accent.pressed",
                })}
              >
                <ImageIcon className={css({ width: "7", height: "7" })} />
              </div>
              <span className={css({ fontWeight: "medium", color: "fg.default" })}>
                {isUploading ? "Uploading..." : "Upload the first image"}
              </span>
              <span className={css({ fontSize: "xs" })}>PNG, JPG or WebP · up to 10MB</span>
            </button>
          </CardContent>
        </Card>
      ) : (
        <div
          className={css({
            display: "grid",
            gap: "4",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          })}
        >
          {images.map((image) => (
            <div
              key={image.publicPath}
              className={cx(
                "group",
                css({
                  position: "relative",
                  aspectRatio: "3 / 4",
                  overflow: "hidden",
                  borderRadius: "xl",
                  border: "1px solid",
                  borderColor: "border.subtle",
                  background: "bg.surface",
                  boxShadow: "card",
                }),
              )}
            >
              <Image
                src={image.publicPath}
                alt={image.filename}
                fill
                sizes="(max-width: 768px) 50vw, 220px"
                className={css({ objectFit: "cover" })}
              />
              <div
                className={css({
                  position: "absolute",
                  insetX: "0",
                  bottom: "0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "2",
                  background: "rgba(18,17,16,0.65)",
                  paddingInline: "3",
                  paddingBlock: "2",
                })}
              >
                <span
                  className={css({
                    truncate: true,
                    fontSize: "xs",
                    color: "white",
                  })}
                  title={image.filename}
                >
                  {image.filename}
                </span>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className={css({ flexShrink: 0, width: "8", height: "8" })}
                  onClick={() => handleDelete(image)}
                  disabled={deletingPath === image.publicPath}
                  aria-label={`Delete ${image.filename}`}
                >
                  <Trash2 className={css({ width: "3.5", height: "3.5" })} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
