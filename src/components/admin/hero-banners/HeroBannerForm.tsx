"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { ArrowLeft, Link2, ListOrdered } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { css } from "styled-system/css";
import { HeroBannerArtworkField } from "@/components/admin/hero-banners/HeroBannerArtworkField";
import {
  RecurrenceScheduleFields,
  defaultRecurrenceValue,
} from "@/components/admin/shared/RecurrenceScheduleFields";

interface HeroBanner {
  id?: string;
  title: string;
  subtitle: string | null;
  imagePath: string;
  mobileImagePath: string | null;
  linkUrl: string | null;
  order: number;
  active: boolean;
  startDate: Date | null;
  endDate: Date | null;
  isRecurring: boolean;
  recurrenceType: string | null;
  recurrenceDaysOfWeek: number[];
  recurrenceDayOfMonth: number | null;
  recurrenceStartTime: string | null;
  recurrenceEndTime: string | null;
}

const noDestinationValue = "__none__";
const customDestinationValue = "__custom__";

const fieldGroup = css({ display: "flex", flexDirection: "column", gap: "2" });
const requiredMark = css({ color: "danger" });

export function HeroBannerForm({ banner }: { banner?: HeroBanner }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    mobileImagePath: banner?.mobileImagePath || "",
    linkUrl: banner ? banner.linkUrl || "" : "/shop",
    order: banner?.order ?? 0,
    active: banner?.active ?? true,
    startDate: banner?.startDate
      ? new Date(banner.startDate).toISOString().split("T")[0]
      : "",
    endDate: banner?.endDate
      ? new Date(banner.endDate).toISOString().split("T")[0]
      : "",
    ...(banner
      ? {
          isRecurring: banner.isRecurring,
          recurrenceType: banner.recurrenceType || "WEEKLY",
          recurrenceDaysOfWeek: banner.recurrenceDaysOfWeek,
          recurrenceDayOfMonth: banner.recurrenceDayOfMonth || 1,
          recurrenceStartTime: banner.recurrenceStartTime || "",
          recurrenceEndTime: banner.recurrenceEndTime || "",
        }
      : defaultRecurrenceValue()),
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
    <div
      className={css({
        marginInline: "auto",
        maxWidth: "6xl",
        display: "flex",
        flexDirection: "column",
        gap: "6",
        paddingBottom: "24",
      })}
    >
      <div
        className={css({
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "4",
        })}
      >
        <div className={css({ display: "flex", alignItems: "center", gap: "3" })}>
          <Link href="/admin/hero-banners">
            <Button
              variant="outline"
              size="icon"
              aria-label="Back to hero banners"
            >
              <ArrowLeft className={css({ width: "4", height: "4" })} />
            </Button>
          </Link>
          <div>
            <p className={css({ fontSize: "sm", fontWeight: "medium", color: "accent.pressed" })}>
              Hero Banners
            </p>
            <h1
              className={css({
                fontFamily: "display",
                fontSize: "3xl",
                fontWeight: "bold",
                letterSpacing: "tight",
                color: "fg.default",
              })}
            >
              {banner ? "Edit banner" : "Create a banner"}
            </h1>
          </div>
        </div>
        <div
          className={css({
            display: "flex",
            alignItems: "center",
            gap: "2",
            borderRadius: "full",
            border: "1px solid",
            borderColor: "border.subtle",
            background: "bg.surface",
            paddingInline: "3",
            paddingBlock: "1.5",
            fontSize: "sm",
          })}
        >
          <span
            className={css({
              width: "2",
              height: "2",
              borderRadius: "full",
              background: formData.active ? "success" : "fg.muted",
            })}
          />
          {formData.active ? "Visible on homepage" : "Hidden from homepage"}
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className={css({
          display: "grid",
          gap: "6",
          lg: { gridTemplateColumns: "1.35fr 0.65fr" },
        })}
      >
        <Card className={css({ overflow: "hidden" })}>
          <CardHeader className={css({ borderBottom: "1px solid", borderColor: "border.subtle", background: "bg.surface" })}>
            <CardTitle className={css({ fontSize: "lg" })}>Banner artwork</CardTitle>
            <CardDescription>
              One landscape image for desktop, and optionally a portrait one
              for phones.
            </CardDescription>
          </CardHeader>
          <CardContent className={css({ display: "flex", flexDirection: "column", gap: "6", padding: "5", sm: { padding: "6" } })}>
            <HeroBannerArtworkField
              label="Desktop image"
              required
              value={formData.imagePath}
              onChange={(url) => setFormData((current) => ({ ...current, imagePath: url }))}
              title={formData.title}
              aspectRatio="16 / 7"
              hint="Around 2400 × 800px (3:1). Shown at every width unless a phone image is added below, so keep any wordmark or text within the middle 70% — the outer edges are cropped by varying amounts."
            />
            <HeroBannerArtworkField
              label="Phone image"
              value={formData.mobileImagePath}
              onChange={(url) => setFormData((current) => ({ ...current, mobileImagePath: url }))}
              title={`${formData.title} (mobile)`}
              variant="mobile"
              aspectRatio="1 / 1"
              maxWidth="20rem"
              hint="Optional, around 1080 × 1080px (square) — that is close to the shape the hero actually has on a phone. A wide banner loses roughly half its width to the crop there, taking any wordmark and button with it. Leave this empty to keep using the desktop image at every size."
            />
          </CardContent>
        </Card>

        <div className={css({ display: "flex", flexDirection: "column", gap: "6" })}>
          <Card>
            <CardHeader className={css({ borderBottom: "1px solid", borderColor: "border.subtle", background: "bg.surface" })}>
              <CardTitle className={css({ fontSize: "lg" })}>Content</CardTitle>
              <CardDescription>
                Keep the message short and easy to scan.
              </CardDescription>
            </CardHeader>
            <CardContent className={css({ display: "flex", flexDirection: "column", gap: "5", padding: "5", sm: { padding: "6" } })}>
              <div className={fieldGroup}>
                <Label htmlFor="title">
                  Headline <span className={requiredMark}>*</span>
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
              <div className={fieldGroup}>
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
              <div className={fieldGroup}>
                <Label htmlFor="destination" className={css({ display: "flex", alignItems: "center", gap: "2" })}>
                  <Link2 className={css({ width: "3.5", height: "3.5" })} /> Where should this banner go?
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
                  <SelectTrigger id="destination" className={css({ width: "full" })}>
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
                <p className={css({ fontSize: "xs", color: "fg.muted" })}>
                  Customers go to this page when they click the banner.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className={css({ borderBottom: "1px solid", borderColor: "border.subtle", background: "bg.surface" })}>
              <CardTitle className={css({ fontSize: "lg" })}>Publishing</CardTitle>
              <CardDescription>
                Control where this banner appears in the carousel.
              </CardDescription>
            </CardHeader>
            <CardContent className={css({ display: "flex", flexDirection: "column", gap: "5", padding: "5", sm: { padding: "6" } })}>
              <div
                className={css({
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderRadius: "lg",
                  border: "1px solid",
                  borderColor: "border.subtle",
                  padding: "3",
                })}
              >
                <div className={css({ display: "flex", flexDirection: "column", gap: "0.5" })}>
                  <Label htmlFor="active">Publish banner</Label>
                  <p className={css({ fontSize: "xs", color: "fg.muted" })}>
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
              <div className={fieldGroup}>
                <Label htmlFor="order" className={css({ display: "flex", alignItems: "center", gap: "2" })}>
                  <ListOrdered className={css({ width: "3.5", height: "3.5" })} /> Display order
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

          <Card>
            <CardHeader className={css({ borderBottom: "1px solid", borderColor: "border.subtle", background: "bg.surface" })}>
              <CardTitle className={css({ fontSize: "lg" })}>Scheduling</CardTitle>
              <CardDescription>
                Optionally limit this banner to a date window, or repeat it
                only on certain days/hours — e.g. a weekend-only promotion.
              </CardDescription>
            </CardHeader>
            <CardContent className={css({ display: "flex", flexDirection: "column", gap: "5", padding: "5", sm: { padding: "6" } })}>
              <div className={css({ display: "grid", gridTemplateColumns: "1fr", gap: "4", sm: { gridTemplateColumns: "1fr 1fr" } })}>
                <div className={fieldGroup}>
                  <Label htmlFor="startDate">Start date (optional)</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
                <div className={fieldGroup}>
                  <Label htmlFor="endDate">End date (optional)</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
              </div>
              <RecurrenceScheduleFields
                value={{
                  isRecurring: formData.isRecurring,
                  recurrenceType: formData.recurrenceType,
                  recurrenceDaysOfWeek: formData.recurrenceDaysOfWeek,
                  recurrenceDayOfMonth: formData.recurrenceDayOfMonth,
                  recurrenceStartTime: formData.recurrenceStartTime,
                  recurrenceEndTime: formData.recurrenceEndTime,
                }}
                onChange={(v) => setFormData({ ...formData, ...v })}
              />
            </CardContent>
          </Card>
        </div>

        <div
          className={css({
            position: "fixed",
            insetX: "0",
            bottom: "0",
            zIndex: "20",
            borderTop: "1px solid",
            borderColor: "border.subtle",
            background: "bg.glassStrong",
            backdropBlur: "glass",
            paddingInline: "4",
            paddingBlock: "3",
            lg: {
              position: "static",
              gridColumn: "span 2",
              border: "0",
              background: "transparent",
              backdropFilter: "none",
              padding: "0",
            },
          })}
        >
          <div
            className={css({
              marginInline: "auto",
              display: "flex",
              maxWidth: "6xl",
              justifyContent: "flex-end",
              gap: "3",
            })}
          >
            <Link href="/admin/hero-banners">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={
                isSubmitting || !formData.imagePath || !formData.title.trim()
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
