"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { css } from "styled-system/css";
import {
  RecurrenceScheduleFields,
  defaultRecurrenceValue,
} from "@/components/admin/shared/RecurrenceScheduleFields";

type PromoBanner = {
  id: string;
  type: string;
  title: string | null;
  message: string;
  bgColor: string | null;
  textColor: string | null;
  isActive: boolean;
  startDate: Date | null;
  endDate: Date | null;
  order: number;
  isRecurring: boolean;
  recurrenceType: string | null;
  recurrenceDaysOfWeek: number[];
  recurrenceDayOfMonth: number | null;
  recurrenceStartTime: string | null;
  recurrenceEndTime: string | null;
};

const fieldGroup = css({ display: "flex", flexDirection: "column", gap: "2" });
const grid2 = css({
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "4",
  sm: { gridTemplateColumns: "1fr 1fr" },
});
const requiredMark = css({ color: "danger" });

export function PromoBannerForm({ banner }: { banner?: PromoBanner }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    type: banner?.type || "top_scroll",
    title: banner?.title || "",
    message: banner?.message || "",
    bgColor: banner?.bgColor || "",
    textColor: banner?.textColor || "",
    isActive: banner?.isActive ?? true,
    startDate: banner?.startDate
      ? new Date(banner.startDate).toISOString().split("T")[0]
      : "",
    endDate: banner?.endDate
      ? new Date(banner.endDate).toISOString().split("T")[0]
      : "",
    order: banner?.order ?? 0,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = banner
        ? `/api/admin/promo-banners/${banner.id}`
        : "/api/admin/promo-banners";
      const method = banner ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          title: formData.title || null,
          bgColor: formData.bgColor || null,
          textColor: formData.textColor || null,
          startDate: formData.startDate || null,
          endDate: formData.endDate || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save banner");
      }

      toast.success(banner ? "Banner updated!" : "Banner created!");
      router.push("/admin/promo-banners");
      router.refresh();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={css({ display: "flex", flexDirection: "column", gap: "6" })}>
      <div className={css({ display: "flex", alignItems: "center", gap: "4" })}>
        <Link href="/admin/promo-banners">
          <Button variant="outline" size="icon" aria-label="Back to promo banners">
            <ArrowLeft className={css({ width: "4", height: "4" })} />
          </Button>
        </Link>
        <div>
          <h1
            className={css({
              fontFamily: "display",
              fontSize: "3xl",
              fontWeight: "bold",
              color: "fg.default",
            })}
          >
            {banner ? "Edit Promo Banner" : "New Promo Banner"}
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className={css({ display: "flex", flexDirection: "column", gap: "6" })}>
        <Card>
          <CardHeader>
            <CardTitle>Message</CardTitle>
            <CardDescription>What customers see and where it appears.</CardDescription>
          </CardHeader>
          <CardContent className={css({ display: "flex", flexDirection: "column", gap: "4" })}>
            <div className={fieldGroup}>
              <Label htmlFor="type">
                Banner Type <span className={requiredMark}>*</span>
              </Label>
              <Select
                value={formData.type}
                onValueChange={(value) =>
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="top_scroll">Top Scroll Message</SelectItem>
                  <SelectItem value="free_gifts">Free Gifts Banner</SelectItem>
                  <SelectItem value="special_offer">Special Offer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className={fieldGroup}>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="Optional title"
              />
            </div>

            <div className={fieldGroup}>
              <Label htmlFor="message">
                Message <span className={requiredMark}>*</span>
              </Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) =>
                  setFormData({ ...formData, message: e.target.value })
                }
                placeholder="Your promotional message"
                required
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Live preview updates as you pick colors.</CardDescription>
          </CardHeader>
          <CardContent className={css({ display: "flex", flexDirection: "column", gap: "4" })}>
            <div className={grid2}>
              <div className={fieldGroup}>
                <Label htmlFor="bgColor">Background Color</Label>
                <div className={css({ display: "flex", gap: "2" })}>
                  <Input
                    id="bgColor"
                    type="color"
                    value={formData.bgColor || "#ffffff"}
                    onChange={(e) =>
                      setFormData({ ...formData, bgColor: e.target.value })
                    }
                    className={css({ width: "16", height: "10", padding: "1", cursor: "pointer" })}
                  />
                  <Input
                    value={formData.bgColor}
                    onChange={(e) =>
                      setFormData({ ...formData, bgColor: e.target.value })
                    }
                    placeholder="#ffffff or gradient"
                  />
                </div>
              </div>

              <div className={fieldGroup}>
                <Label htmlFor="textColor">Text Color</Label>
                <div className={css({ display: "flex", gap: "2" })}>
                  <Input
                    id="textColor"
                    type="color"
                    value={formData.textColor || "#000000"}
                    onChange={(e) =>
                      setFormData({ ...formData, textColor: e.target.value })
                    }
                    className={css({ width: "16", height: "10", padding: "1", cursor: "pointer" })}
                  />
                  <Input
                    value={formData.textColor}
                    onChange={(e) =>
                      setFormData({ ...formData, textColor: e.target.value })
                    }
                    placeholder="#000000"
                  />
                </div>
              </div>
            </div>

            <div className={fieldGroup}>
              <Label>Preview</Label>
              <div
                className={css({
                  display: "flex",
                  alignItems: "center",
                  borderRadius: "lg",
                  border: "1px solid",
                  borderColor: "border.subtle",
                  paddingInline: "4",
                  paddingBlock: "3",
                  fontSize: "sm",
                  fontWeight: "medium",
                  minHeight: "12",
                })}
                style={{
                  background: formData.bgColor || undefined,
                  color: formData.textColor || undefined,
                }}
              >
                {formData.title ? `${formData.title} — ` : ""}
                {formData.message || "Your promotional message will appear here"}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Schedule &amp; Publishing</CardTitle>
            <CardDescription>Control when and in what order this banner shows.</CardDescription>
          </CardHeader>
          <CardContent className={css({ display: "flex", flexDirection: "column", gap: "4" })}>
            <div className={grid2}>
              <div className={fieldGroup}>
                <Label htmlFor="startDate">Start Date (Optional)</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData({ ...formData, startDate: e.target.value })
                  }
                />
              </div>

              <div className={fieldGroup}>
                <Label htmlFor="endDate">End Date (Optional)</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) =>
                    setFormData({ ...formData, endDate: e.target.value })
                  }
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
              description="Optionally repeat this banner only on certain days or hours within the Start/End Date window above."
            />

            <div className={fieldGroup}>
              <Label htmlFor="order">Display Order</Label>
              <Input
                id="order"
                type="number"
                value={formData.order}
                onChange={(e) =>
                  setFormData({ ...formData, order: parseInt(e.target.value) })
                }
              />
            </div>

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
                <Label htmlFor="isActive">Active</Label>
                <p className={css({ fontSize: "xs", color: "fg.muted" })}>
                  Show this banner on the storefront
                </p>
              </div>
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked })
                }
              />
            </div>

            <div className={css({ display: "flex", gap: "4", paddingTop: "4" })}>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : banner ? "Update" : "Create"}
              </Button>
              <Link href="/admin/promo-banners">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
