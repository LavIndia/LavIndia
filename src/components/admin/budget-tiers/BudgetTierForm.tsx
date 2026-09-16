"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { css } from "styled-system/css";

type BudgetTier = {
  id: string;
  title: string;
  maxPrice: number;
  gradient: string | null;
  icon: string | null;
  order: number;
  isActive: boolean;
};

const pageStyle = css({ display: "flex", flexDirection: "column", gap: "6" });
const headerRowStyle = css({ display: "flex", alignItems: "center", gap: "4" });
const headingStyle = css({ fontFamily: "display", fontSize: "2xl", fontWeight: "bold", color: "fg.default", md: { fontSize: "3xl" } });
const formStyle = css({ display: "flex", flexDirection: "column", gap: "6" });
const fieldGroupStyle = css({ display: "flex", flexDirection: "column", gap: "4" });
const fieldStyle = css({ display: "flex", flexDirection: "column", gap: "2" });
const requiredMarkStyle = css({ color: "danger" });
const helpTextStyle = css({ fontSize: "sm", color: "fg.muted" });
const gradientPreviewStyle = css({ width: "full", height: "16", borderRadius: "md", marginTop: "2", border: "1px solid", borderColor: "border.subtle" });
const switchRowStyle = css({ display: "flex", alignItems: "center", gap: "3" });
const actionsRowStyle = css({ display: "flex", flexDirection: "column", gap: "3", paddingTop: "4", sm: { flexDirection: "row" } });
const actionButtonStyle = css({ width: "full", sm: { width: "auto" } });

export function BudgetTierForm({ tier }: { tier?: BudgetTier }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: tier?.title || "",
    maxPrice: tier ? tier.maxPrice / 100 : 0, // Convert from paisa to rupees for display
    gradient: tier?.gradient || "",
    icon: tier?.icon || "",
    order: tier?.order ?? 0,
    isActive: tier?.isActive ?? true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = tier
        ? `/api/admin/budget-tiers/${tier.id}`
        : "/api/admin/budget-tiers";
      const method = tier ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          maxPrice: Math.round(formData.maxPrice * 100), // Convert to paisa
          gradient: formData.gradient || null,
          icon: formData.icon || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save tier");
      }

      toast.success(tier ? "Budget tier updated!" : "Budget tier created!");
      router.push("/admin/budget-tiers");
      router.refresh();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={pageStyle}>
      <div className={headerRowStyle}>
        <Link href="/admin/budget-tiers">
          <Button variant="outline" size="icon" aria-label="Back to budget tiers">
            <ArrowLeft className={css({ height: "4", width: "4" })} />
          </Button>
        </Link>
        <h1 className={headingStyle}>
          {tier ? "Edit Budget Tier" : "New Budget Tier"}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className={formStyle}>
        <Card>
          <CardHeader>
            <CardTitle>Tier Details</CardTitle>
            <CardDescription>
              Core information shown to shoppers browsing by budget.
            </CardDescription>
          </CardHeader>
          <CardContent className={fieldGroupStyle}>
            <div className={fieldStyle}>
              <Label htmlFor="title">
                Title <span className={requiredMarkStyle}>*</span>
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="e.g., Shop Under ₹1,000"
                required
              />
            </div>

            <div className={fieldStyle}>
              <Label htmlFor="maxPrice">
                Maximum Price (₹) <span className={requiredMarkStyle}>*</span>
              </Label>
              <Input
                id="maxPrice"
                type="number"
                value={formData.maxPrice}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    maxPrice: parseFloat(e.target.value),
                  })
                }
                placeholder="1000"
                required
                min="0"
                step="0.01"
              />
            </div>

            <div className={switchRowStyle}>
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked })
                }
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>
              Optional styling for how this tier is presented on the storefront.
            </CardDescription>
          </CardHeader>
          <CardContent className={fieldGroupStyle}>
            <div className={fieldStyle}>
              <Label htmlFor="gradient">Gradient CSS</Label>
              <Input
                id="gradient"
                value={formData.gradient}
                onChange={(e) =>
                  setFormData({ ...formData, gradient: e.target.value })
                }
                placeholder="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
              />
              {formData.gradient && (
                <div
                  className={gradientPreviewStyle}
                  style={{ background: formData.gradient }}
                />
              )}
            </div>

            <div className={fieldStyle}>
              <Label htmlFor="icon">Icon Name</Label>
              <Input
                id="icon"
                value={formData.icon}
                onChange={(e) =>
                  setFormData({ ...formData, icon: e.target.value })
                }
                placeholder="e.g., Tag, DollarSign, Gift"
              />
              <p className={helpTextStyle}>Lucide React icon name</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ordering</CardTitle>
            <CardDescription>
              Controls the position of this tier among other budget tiers.
            </CardDescription>
          </CardHeader>
          <CardContent className={fieldGroupStyle}>
            <div className={fieldStyle}>
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
          </CardContent>
        </Card>

        <div className={actionsRowStyle}>
          <Button type="submit" disabled={isSubmitting} className={actionButtonStyle}>
            {isSubmitting ? "Saving..." : tier ? "Update" : "Create"}
          </Button>
          <Link href="/admin/budget-tiers" className={actionButtonStyle}>
            <Button type="button" variant="outline" className={actionButtonStyle}>
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
