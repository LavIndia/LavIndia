"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

type BudgetTier = {
  id: string;
  title: string;
  maxPrice: number;
  gradient: string | null;
  icon: string | null;
  order: number;
  isActive: boolean;
};

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
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/budget-tiers">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">
            {tier ? "Edit Budget Tier" : "New Budget Tier"}
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Tier Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
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

            <div className="space-y-2">
              <Label htmlFor="maxPrice">Maximum Price (₹) *</Label>
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

            <div className="space-y-2">
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
                  className="w-full h-16 rounded-md mt-2"
                  style={{ background: formData.gradient }}
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="icon">Icon Name</Label>
              <Input
                id="icon"
                value={formData.icon}
                onChange={(e) =>
                  setFormData({ ...formData, icon: e.target.value })
                }
                placeholder="e.g., Tag, DollarSign, Gift"
              />
              <p className="text-sm text-muted-foreground">
                Lucide React icon name
              </p>
            </div>

            <div className="space-y-2">
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
                {isSubmitting ? "Saving..." : tier ? "Update" : "Create"}
              </Button>
              <Link href="/admin/budget-tiers">
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
