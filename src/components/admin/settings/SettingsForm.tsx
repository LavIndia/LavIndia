"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface SiteSettings {
  id: string;
  businessName: string;
  address: string | null;
  contactNumber: string | null;
  email: string | null;
  gstNumber: string | null;
  facebook: string | null;
  instagram: string | null;
  twitter: string | null;
  linkedin: string | null;
  amazonLink: string | null;
  flipkartLink: string | null;
  myntraLink: string | null;
  codAvailable: boolean;
  customerCount: string;
  rating: string;
  supportHoursStart: string | null;
  supportHoursEnd: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
  copyrightText: string | null;
}

interface SettingsFormProps {
  initialSettings: SiteSettings;
}

export function SettingsForm({ initialSettings }: SettingsFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState(initialSettings);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (!res.ok) throw new Error("Failed to update");

      toast.success("Settings updated successfully");
      router.refresh();
    } catch {
      toast.error("Failed to update settings");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof SiteSettings, value: string) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Business Information */}
      <Card>
        <CardHeader>
          <CardTitle>Business Information</CardTitle>
          <CardDescription>Basic details about your business</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="businessName">Business Name *</Label>
            <Input
              id="businessName"
              value={settings.businessName}
              onChange={(e) => handleChange("businessName", e.target.value)}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={settings.address || ""}
              onChange={(e) => handleChange("address", e.target.value)}
              placeholder="123 Main St, City, State"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={settings.email || ""}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="contact@lavishindia.com"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="contactNumber">Contact Number</Label>
              <Input
                id="contactNumber"
                value={settings.contactNumber || ""}
                onChange={(e) => handleChange("contactNumber", e.target.value)}
                placeholder="+91 1234567890"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="gstNumber">GST Number</Label>
            <Input
              id="gstNumber"
              value={settings.gstNumber || ""}
              onChange={(e) => handleChange("gstNumber", e.target.value)}
              placeholder="22AAAAA0000A1Z5"
            />
          </div>
        </CardContent>
      </Card>

      {/* Social Media */}
      <Card>
        <CardHeader>
          <CardTitle>Social Media Links</CardTitle>
          <CardDescription>Your social media presence</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="facebook">Facebook</Label>
              <Input
                id="facebook"
                value={settings.facebook || ""}
                onChange={(e) => handleChange("facebook", e.target.value)}
                placeholder="https://facebook.com/lavishindia"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="instagram">Instagram</Label>
              <Input
                id="instagram"
                value={settings.instagram || ""}
                onChange={(e) => handleChange("instagram", e.target.value)}
                placeholder="https://instagram.com/lavishindia"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="twitter">Twitter</Label>
              <Input
                id="twitter"
                value={settings.twitter || ""}
                onChange={(e) => handleChange("twitter", e.target.value)}
                placeholder="https://twitter.com/lavishindia"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="linkedin">LinkedIn</Label>
              <Input
                id="linkedin"
                value={settings.linkedin || ""}
                onChange={(e) => handleChange("linkedin", e.target.value)}
                placeholder="https://linkedin.com/company/lavishindia"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Marketplace Links */}
      <Card>
        <CardHeader>
          <CardTitle>Marketplace Links</CardTitle>
          <CardDescription>
            Links to your products on other platforms
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="amazonLink">Amazon Store</Label>
            <Input
              id="amazonLink"
              value={settings.amazonLink || ""}
              onChange={(e) => handleChange("amazonLink", e.target.value)}
              placeholder="https://amazon.in/..."
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="flipkartLink">Flipkart Store</Label>
            <Input
              id="flipkartLink"
              value={settings.flipkartLink || ""}
              onChange={(e) => handleChange("flipkartLink", e.target.value)}
              placeholder="https://flipkart.com/..."
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="myntraLink">Myntra Store</Label>
            <Input
              id="myntraLink"
              value={settings.myntraLink || ""}
              onChange={(e) => handleChange("myntraLink", e.target.value)}
              placeholder="https://myntra.com/..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Trust Badges */}
      <Card>
        <CardHeader>
          <CardTitle>Trust Badges</CardTitle>
          <CardDescription>
            Configure trust indicators displayed on the website
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="codAvailable"
              checked={settings.codAvailable}
              onCheckedChange={(checked) =>
                setSettings((prev) => ({ ...prev, codAvailable: checked }))
              }
            />
            <Label htmlFor="codAvailable">Cash on Delivery Available</Label>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="customerCount">Total Customers</Label>
            <Input
              id="customerCount"
              type="text"
              value={settings.customerCount}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  customerCount: e.target.value,
                }))
              }
              placeholder="9L+"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="rating">Customer Rating (out of 5)</Label>
            <Input
              id="rating"
              type="text"
              value={settings.rating}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  rating: e.target.value,
                }))
              }
              placeholder="4.8"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="supportHoursStart">Support Start Time</Label>
              <Input
                id="supportHoursStart"
                type="time"
                value={settings.supportHoursStart || ""}
                onChange={(e) =>
                  handleChange("supportHoursStart", e.target.value)
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="supportHoursEnd">Support End Time</Label>
              <Input
                id="supportHoursEnd"
                type="time"
                value={settings.supportHoursEnd || ""}
                onChange={(e) =>
                  handleChange("supportHoursEnd", e.target.value)
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SEO Settings */}
      <Card>
        <CardHeader>
          <CardTitle>SEO Settings</CardTitle>
          <CardDescription>Search engine optimization metadata</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="metaTitle">Meta Title</Label>
            <Input
              id="metaTitle"
              value={settings.metaTitle || ""}
              onChange={(e) => handleChange("metaTitle", e.target.value)}
              placeholder="lavindia - Premium Jewelry Collection"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="metaDescription">Meta Description</Label>
            <Textarea
              id="metaDescription"
              value={settings.metaDescription || ""}
              onChange={(e) => handleChange("metaDescription", e.target.value)}
              placeholder="Discover exquisite jewelry pieces from lavindia..."
              rows={3}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="metaKeywords">Meta Keywords</Label>
            <Input
              id="metaKeywords"
              value={settings.metaKeywords || ""}
              onChange={(e) => handleChange("metaKeywords", e.target.value)}
              placeholder="jewelry, necklaces, earrings, rings, lavish india"
            />
          </div>
        </CardContent>
      </Card>

      {/* Footer Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Footer Settings</CardTitle>
          <CardDescription>Configure footer content</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="copyrightText">Copyright Text</Label>
            <Input
              id="copyrightText"
              value={settings.copyrightText || ""}
              onChange={(e) => handleChange("copyrightText", e.target.value)}
              placeholder="© 2025 lavindia. All rights reserved."
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </div>
    </form>
  );
}
