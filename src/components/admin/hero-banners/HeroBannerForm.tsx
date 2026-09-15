"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft,
  Check,
  ImageIcon,
  Link2,
  ListOrdered,
  Upload,
  X,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface HeroBanner {
  id?: string;
  title: string;
  subtitle: string | null;
  imagePath: string;
  linkUrl: string | null;
  order: number;
  active: boolean;
}

const noDestinationValue = "__none__";
const customDestinationValue = "__custom__";

export function HeroBannerForm({ banner }: { banner?: HeroBanner }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [destinationOptions, setDestinationOptions] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const [destinationType, setDestinationType] = useState(() => {
    if (!banner) return "/shop";
    if (!banner.linkUrl) return noDestinationValue;
    return destinationOptions.some((option) => option.value === banner.linkUrl)
      ? banner.linkUrl
      : customDestinationValue;
  });
  const [formData, setFormData] = useState({
    title: banner?.title || "",
    subtitle: banner?.subtitle || "",
    imagePath: banner?.imagePath || "",
    linkUrl: banner ? banner.linkUrl || "" : "/shop",
    order: banner?.order ?? 0,
    active: banner?.active ?? true,
  });

  useEffect(() => {
    fetch("/api/admin/hero-banners/destinations")
      .then((response) => (response.ok ? response.json() : null))
      .then((result) => {
        const options = result?.destinations || [];
        setDestinationOptions(options);
        if (
          banner?.linkUrl &&
          options.some(
            (option: { value: string }) => option.value === banner.linkUrl,
          )
        ) {
          setDestinationType(banner.linkUrl);
        }
      })
      .catch(() => toast.error("Could not load destination options"));
  }, [banner?.linkUrl]);

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const uploadData = new FormData();
      uploadData.append("file", file);
      uploadData.append("title", formData.title);
      const response = await fetch("/api/admin/hero-banners/upload", {
        method: "POST",
        body: uploadData,
      });

      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Failed to upload image");

      setFormData((current) => ({ ...current, imagePath: result.url }));
      toast.success("Image uploaded");
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to upload image";
      toast.error(message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = banner
        ? `/api/admin/hero-banners/${banner.id}`
        : "/api/admin/hero-banners";
      const method = banner ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save banner");
      }

      toast.success(banner ? "Banner updated!" : "Banner created!");
      router.push("/admin/hero-banners");
      router.refresh();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "An error occurred";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-24">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/admin/hero-banners">
            <Button
              variant="outline"
              size="icon"
              aria-label="Back to hero banners"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <p className="text-sm font-medium text-primary">Hero Banners</p>
            <h1 className="text-3xl font-bold tracking-tight">
              {banner ? "Edit banner" : "Create a banner"}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-1.5 text-sm">
          <span
            className={`h-2 w-2 rounded-full ${formData.active ? "bg-emerald-500" : "bg-muted-foreground"}`}
          />
          {formData.active ? "Visible on homepage" : "Hidden from homepage"}
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]"
      >
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/20">
            <CardTitle className="text-lg">Banner artwork</CardTitle>
            <CardDescription>
              Use a wide image for the best desktop and mobile crop.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-5 sm:p-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="hero-image-upload">
                  Image <span className="text-destructive">*</span>
                </Label>
                {formData.imagePath && (
                  <span className="flex items-center gap-1 text-xs text-emerald-600">
                    <Check className="h-3.5 w-3.5" /> Stored image
                  </span>
                )}
              </div>
              <input
                ref={fileInputRef}
                id="hero-image-upload"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageUpload}
                className="hidden"
              />
              {formData.imagePath ? (
                <div className="group relative aspect-[16/7] overflow-hidden rounded-xl border bg-muted shadow-sm">
                  <Image
                    src={formData.imagePath}
                    alt="Hero banner preview"
                    fill
                    sizes="(max-width: 768px) 100vw, 768px"
                    className="object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 flex translate-y-full items-center justify-between bg-black/65 px-3 py-2 text-white transition-transform group-hover:translate-y-0">
                    <span className="truncate text-xs">Ready to publish</span>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      <Upload className="mr-2 h-3.5 w-3.5" /> Replace
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute right-3 top-3 opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={() =>
                      setFormData((current) => ({ ...current, imagePath: "" }))
                    }
                    aria-label="Remove selected image"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  className="flex aspect-[16/6] w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <div className="rounded-full bg-primary/10 p-3 text-primary">
                    <ImageIcon className="h-7 w-7" />
                  </div>
                  <span className="font-medium text-foreground">
                    {isUploading ? "Uploading..." : "Choose a banner image"}
                  </span>
                  <span className="text-xs">PNG, JPG or WebP · up to 10MB</span>
                </button>
              )}
              <p className="text-xs text-muted-foreground">
                Images are saved directly to the hero banner storage folder.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="border-b bg-muted/20">
              <CardTitle className="text-lg">Content</CardTitle>
              <CardDescription>
                Keep the message short and easy to scan.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 p-5 sm:p-6">
              <div className="space-y-2">
                <Label htmlFor="title">
                  Headline <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="New season, new shine"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subtitle">Supporting text</Label>
                <Input
                  id="subtitle"
                  value={formData.subtitle}
                  onChange={(e) =>
                    setFormData({ ...formData, subtitle: e.target.value })
                  }
                  placeholder="Discover the latest collection"
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="destination"
                  className="flex items-center gap-2"
                >
                  <Link2 className="h-3.5 w-3.5" /> Where should this banner go?
                </Label>
                <Select
                  value={destinationType}
                  onValueChange={(value) => {
                    setDestinationType(value);
                    setFormData((current) => ({
                      ...current,
                      linkUrl:
                        value === noDestinationValue ||
                        value === customDestinationValue
                          ? value === noDestinationValue
                            ? ""
                            : current.linkUrl
                          : value,
                    }));
                  }}
                >
                  <SelectTrigger id="destination" className="w-full">
                    <SelectValue placeholder="Choose a page" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={noDestinationValue}>No link</SelectItem>
                    {destinationOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                    <SelectItem value={customDestinationValue}>
                      Custom page or URL
                    </SelectItem>
                  </SelectContent>
                </Select>
                {destinationType === customDestinationValue && (
                  <Input
                    id="linkUrl"
                    value={formData.linkUrl}
                    onChange={(e) =>
                      setFormData((current) => ({
                        ...current,
                        linkUrl: e.target.value,
                      }))
                    }
                    placeholder="/your-page or https://example.com"
                  />
                )}
                <p className="text-xs text-muted-foreground">
                  Customers go to this page when they click the banner.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b bg-muted/20">
              <CardTitle className="text-lg">Publishing</CardTitle>
              <CardDescription>
                Control where this banner appears in the carousel.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 p-5 sm:p-6">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="active">Publish banner</Label>
                  <p className="text-xs text-muted-foreground">
                    Show this slide on the homepage
                  </p>
                </div>
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, active: checked })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="order" className="flex items-center gap-2">
                  <ListOrdered className="h-3.5 w-3.5" /> Display order
                </Label>
                <Input
                  id="order"
                  type="number"
                  min="0"
                  value={formData.order}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      order: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 px-4 py-3 backdrop-blur lg:static lg:col-span-2 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
          <div className="mx-auto flex max-w-6xl justify-end gap-3">
            <Link href="/admin/hero-banners">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={
                isSubmitting ||
                isUploading ||
                !formData.imagePath ||
                !formData.title.trim()
              }
            >
              {isSubmitting
                ? "Saving..."
                : banner
                  ? "Save changes"
                  : "Create banner"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
