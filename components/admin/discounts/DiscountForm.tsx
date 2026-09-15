"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
};

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
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/discounts">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">
            {discount ? "Edit Discount" : "New Discount"}
          </h1>
          <p className="text-muted-foreground">
            {discount
              ? "Update discount details"
              : "Create a new discount coupon"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Discount Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Coupon Code *</Label>
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

              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
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

            <div className="space-y-2">
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="discountType">Discount Type *</Label>
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

              <div className="space-y-2">
                <Label htmlFor="discountValue">
                  Discount Value *{" "}
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
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

              <div className="space-y-2">
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
                <p className="text-xs text-muted-foreground">
                  Only for percentage discounts
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date *</Label>
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

              <div className="space-y-2">
                <Label htmlFor="endDate">End Date *</Label>
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

            <div className="space-y-2">
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

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked })
                }
              />
              <Label htmlFor="isActive">Active</Label>
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : discount ? "Update" : "Create"}
              </Button>
              <Link href="/admin/discounts">
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
