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
import { RecurrenceScheduleFields } from "@/components/admin/shared/RecurrenceScheduleFields";

type Discount = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  discountType: string;
  discountValue: number;
  minPurchase: number | null;
  maxDiscount: number | null;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  usageLimit: number | null;
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

export function DiscountForm({ discount }: { discount?: Discount }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    code: discount?.code || "",
    title: discount?.title || "",
    description: discount?.description || "",
    discountType: discount?.discountType || "PERCENTAGE",
    discountValue: discount?.discountValue || 0,
    minPurchase: discount?.minPurchase || 0,
    maxDiscount: discount?.maxDiscount || 0,
    startDate: discount?.startDate
      ? new Date(discount.startDate).toISOString().split("T")[0]
      : "",
    endDate: discount?.endDate
      ? new Date(discount.endDate).toISOString().split("T")[0]
      : "",
    isActive: discount?.isActive ?? true,
    usageLimit: discount?.usageLimit || 0,
    isRecurring: discount?.isRecurring ?? false,
    recurrenceType: discount?.recurrenceType || "WEEKLY",
    recurrenceDaysOfWeek: discount?.recurrenceDaysOfWeek || [],
    recurrenceDayOfMonth: discount?.recurrenceDayOfMonth || 1,
    recurrenceStartTime: discount?.recurrenceStartTime || "",
    recurrenceEndTime: discount?.recurrenceEndTime || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = discount
        ? `/api/admin/discounts/${discount.id}`
        : "/api/admin/discounts";
      const method = discount ? "PUT" : "POST";

      const payload = {
        code: formData.code.toUpperCase(),
        title: formData.title,
        description: formData.description || null,
        discountType: formData.discountType,
        discountValue:
          formData.discountType === "PERCENTAGE"
            ? formData.discountValue
            : formData.discountValue * 100, // Convert to paisa
        minPurchase: formData.minPurchase ? formData.minPurchase * 100 : null,
        maxDiscount: formData.maxDiscount ? formData.maxDiscount * 100 : null,
        startDate: formData.startDate,
        endDate: formData.endDate,
        isActive: formData.isActive,
        usageLimit: formData.usageLimit || null,
        isRecurring: formData.isRecurring,
        recurrenceType: formData.isRecurring ? formData.recurrenceType : null,
        recurrenceDaysOfWeek:
          formData.isRecurring && formData.recurrenceType === "WEEKLY"
            ? formData.recurrenceDaysOfWeek
            : [],
        recurrenceDayOfMonth:
          formData.isRecurring && formData.recurrenceType === "MONTHLY"
            ? formData.recurrenceDayOfMonth
            : null,
        recurrenceStartTime: formData.isRecurring
          ? formData.recurrenceStartTime || null
          : null,
        recurrenceEndTime: formData.isRecurring
          ? formData.recurrenceEndTime || null
          : null,
      };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save discount");
      }

      toast.success(discount ? "Discount updated!" : "Discount created!");
      router.push("/admin/discounts");
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
        <Link href="/admin/discounts">
          <Button variant="outline" size="icon" aria-label="Back to discounts">
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
            {discount ? "Edit Discount" : "New Discount"}
          </h1>
          <p className={css({ color: "fg.muted" })}>
            {discount
              ? "Update discount details"
              : "Create a new discount coupon"}
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className={css({ display: "flex", flexDirection: "column", gap: "6" })}
      >
        <Card>
          <CardHeader>
            <CardTitle>Basics</CardTitle>
            <CardDescription>
              The code customers enter and how it&apos;s described to them.
            </CardDescription>
          </CardHeader>
          <CardContent className={css({ display: "flex", flexDirection: "column", gap: "4" })}>
            <div className={grid2}>
              <div className={fieldGroup}>
                <Label htmlFor="code">
                  Coupon Code <span className={requiredMark}>*</span>
                </Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      code: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="SAVE20"
                  required
                />
              </div>

              <div className={fieldGroup}>
                <Label htmlFor="title">
                  Title <span className={requiredMark}>*</span>
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="20% Off Sale"
                  required
                />
              </div>
            </div>

            <div className={fieldGroup}>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Special discount for loyal customers"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Discount Rules</CardTitle>
            <CardDescription>
              How much customers save, and any spend limits.
            </CardDescription>
          </CardHeader>
          <CardContent className={css({ display: "flex", flexDirection: "column", gap: "4" })}>
            <div className={grid2}>
              <div className={fieldGroup}>
                <Label htmlFor="discountType">
                  Discount Type <span className={requiredMark}>*</span>
                </Label>
                <Select
                  value={formData.discountType}
                  onValueChange={(value) =>
                    setFormData({ ...formData, discountType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                    <SelectItem value="FIXED_AMOUNT">
                      Fixed Amount (₹)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className={fieldGroup}>
                <Label htmlFor="discountValue">
                  Discount Value{" "}
                  <span className={requiredMark}>*</span>{" "}
                  {formData.discountType === "PERCENTAGE" ? "(%)" : "(₹)"}
                </Label>
                <Input
                  id="discountValue"
                  type="number"
                  value={formData.discountValue || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      discountValue: e.target.value
                        ? parseFloat(e.target.value)
                        : 0,
                    })
                  }
                  required
                  min="0"
                  step={formData.discountType === "PERCENTAGE" ? "1" : "0.01"}
                />
              </div>
            </div>

            <div className={grid2}>
              <div className={fieldGroup}>
                <Label htmlFor="minPurchase">Min Purchase Amount (₹)</Label>
                <Input
                  id="minPurchase"
                  type="number"
                  value={formData.minPurchase || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      minPurchase: e.target.value
                        ? parseFloat(e.target.value)
                        : 0,
                    })
                  }
                  min="0"
                  step="0.01"
                />
              </div>

              <div className={fieldGroup}>
                <Label htmlFor="maxDiscount">Max Discount Amount (₹)</Label>
                <Input
                  id="maxDiscount"
                  type="number"
                  value={formData.maxDiscount || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxDiscount: e.target.value
                        ? parseFloat(e.target.value)
                        : 0,
                    })
                  }
                  min="0"
                  step="0.01"
                  disabled={formData.discountType === "FIXED_AMOUNT"}
                />
                <p className={css({ fontSize: "xs", color: "fg.muted" })}>
                  Only for percentage discounts
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Validity &amp; Limits</CardTitle>
            <CardDescription>
              When the coupon is redeemable and how often.
            </CardDescription>
          </CardHeader>
          <CardContent className={css({ display: "flex", flexDirection: "column", gap: "4" })}>
            <div className={grid2}>
              <div className={fieldGroup}>
                <Label htmlFor="startDate">
                  Start Date <span className={requiredMark}>*</span>
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData({ ...formData, startDate: e.target.value })
                  }
                  required
                />
              </div>

              <div className={fieldGroup}>
                <Label htmlFor="endDate">
                  End Date <span className={requiredMark}>*</span>
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) =>
                    setFormData({ ...formData, endDate: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div className={fieldGroup}>
              <Label htmlFor="usageLimit">Usage Limit</Label>
              <Input
                id="usageLimit"
                type="number"
                value={formData.usageLimit}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    usageLimit: parseInt(e.target.value),
                  })
                }
                min="0"
                placeholder="Leave 0 for unlimited"
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
                  Customers can redeem this coupon while active
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

          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recurring Schedule</CardTitle>
            <CardDescription>
              Optionally limit this coupon to repeat only on certain days or
              hours within the Start/End Date window above — e.g. every
              Friday-Sunday, or 6-9pm daily.
            </CardDescription>
          </CardHeader>
          <CardContent>
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

        <div className={css({ display: "flex", gap: "4" })}>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : discount ? "Update" : "Create"}
          </Button>
          <Link href="/admin/discounts">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
