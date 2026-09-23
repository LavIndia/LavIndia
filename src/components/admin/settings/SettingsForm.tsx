"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { css } from "styled-system/css";
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
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { InfoHint } from "@/components/ui/info-hint";
import { DeliveryChargesSection } from "./DeliveryChargesSection";
import { LogoSection } from "./LogoSection";
import { SocialLinksSection } from "./SocialLinksSection";
import { MarketplaceLinksSection } from "./MarketplaceLinksSection";
import { TrustBadgesSection } from "./TrustBadgesSection";

interface SiteSettings {
  id: string;
  businessName: string;
  logoUrl: string | null;
  address: string | null;
  contactNumber: string | null;
  email: string | null;
  gstNumber: string | null;
  upiVpa: string | null;
  upiPayeeName: string | null;
  codFeeCents: number;
  facebook: string | null;
  instagram: string | null;
  twitter: string | null;
  linkedin: string | null;
  amazonLink: string | null;
  flipkartLink: string | null;
  myntraLink: string | null;
  blinkitLink: string | null;
  zeptoLink: string | null;
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

const formStyle = css({ display: "flex", flexDirection: "column", gap: "6" });
const cardBody = css({ display: "flex", flexDirection: "column", gap: "4" });
const fieldStyle = css({ display: "flex", flexDirection: "column", gap: "2" });
const fieldRow = css({
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "4",
  sm: { gridTemplateColumns: "repeat(2, 1fr)" },
});
const footerRow = css({ display: "flex", justifyContent: "flex-end" });
const spinnerStyle = css({ height: "4", width: "4", animation: "spin" });

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

  // Not every setting is a string — the cash-on-delivery fee is a number of
  // paise, and coercing it to text here would send "1500" through as a
  // string and fail validation on the way in.
  const handleChange = <K extends keyof SiteSettings>(field: K, value: SiteSettings[K]) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className={formStyle}>
      {/* The mark comes before the name: it is the first thing anyone sees
          of the shop, and it saves itself rather than waiting for the form. */}
      <LogoSection initialLogoUrl={settings.logoUrl} />

      {/* Business Information */}
      <Card>
        <CardHeader>
          <CardTitle>Business Information</CardTitle>
          <CardDescription>Basic details about your business</CardDescription>
        </CardHeader>
        <CardContent className={cardBody}>
          <div className={fieldStyle}>
            <Label htmlFor="businessName">Business Name *</Label>
            <Input
              id="businessName"
              value={settings.businessName}
              onChange={(e) => handleChange("businessName", e.target.value)}
              required
            />
          </div>

          <div className={fieldStyle}>
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={settings.address || ""}
              onChange={(e) => handleChange("address", e.target.value)}
              placeholder="123 Main St, City, State"
            />
          </div>

          <div className={fieldRow}>
            <div className={fieldStyle}>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={settings.email || ""}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="contact@lavishindia.com"
              />
            </div>

            <div className={fieldStyle}>
              <Label htmlFor="contactNumber">Contact Number</Label>
              <Input
                id="contactNumber"
                value={settings.contactNumber || ""}
                onChange={(e) => handleChange("contactNumber", e.target.value)}
                placeholder="+91 1234567890"
              />
            </div>
          </div>

          <div className={fieldStyle}>
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

      {/* Payments — the UPI details used to build the counter bill QR. */}
      <Card>
        <CardHeader>
          <CardTitle>
            Payments
            <InfoHint label="How to set up UPI collection" below>
              Two details are needed, both from the UPI app you already
              collect payments in. Once saved, every counter bill shows a QR
              with the exact amount filled in, so a customer cannot pay the
              wrong figure.
            </InfoHint>
          </CardTitle>
          <CardDescription>
            Used to show a scannable UPI QR on counter bills.
          </CardDescription>
        </CardHeader>
        <CardContent className={cardBody}>
          <div className={fieldRow}>
            <div className={fieldStyle}>
              <Label htmlFor="upiVpa">
                UPI ID
                <InfoHint label="Where to find your UPI ID" below>
                  Step 1 — open the UPI app you take payments in (GPay,
                  PhonePe, Paytm or your bank).
                  <br />
                  Step 2 — open your profile, where it is shown as your
                  &ldquo;UPI ID&rdquo; or &ldquo;VPA&rdquo;.
                  <br />
                  Step 3 — copy it exactly. It looks like an email address but
                  is not one, for example{" "}
                  <strong>lavindia@okhdfcbank</strong>.
                  <br />
                  Step 4 — paste it here and save, then take one ₹1 test
                  payment from your own phone to confirm it reaches the right
                  account. A wrong ID sends your customers&rsquo; money to a
                  stranger, and nothing in this system can recover it.
                </InfoHint>
              </Label>
              <Input
                id="upiVpa"
                value={settings.upiVpa || ""}
                onChange={(e) => handleChange("upiVpa", e.target.value)}
                placeholder="yourname@okhdfcbank"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <div className={fieldStyle}>
              <Label htmlFor="upiPayeeName">
                Name shown to the customer
                <InfoHint label="About the payee name" below>
                  What appears in the customer&rsquo;s UPI app before they
                  confirm the payment. Use the trading name they would
                  recognise from your shopfront — an unfamiliar name makes
                  people hesitate to pay. Leave blank to use the business name
                  above.
                </InfoHint>
              </Label>
              <Input
                id="upiPayeeName"
                value={settings.upiPayeeName || ""}
                onChange={(e) => handleChange("upiPayeeName", e.target.value)}
                placeholder="LavIndia"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* What delivery costs the customer. Sits next to payments because it
          is the other half of the same conversation. */}
      <DeliveryChargesSection
        codFeeCents={settings.codFeeCents ?? 0}
        onChange={(codFeeCents) => handleChange("codFeeCents", codFeeCents)}
      />

      <SocialLinksSection
        values={{
          facebook: settings.facebook,
          instagram: settings.instagram,
          twitter: settings.twitter,
          linkedin: settings.linkedin,
        }}
        onChange={handleChange}
      />

      <MarketplaceLinksSection
        values={{
          amazonLink: settings.amazonLink,
          flipkartLink: settings.flipkartLink,
          myntraLink: settings.myntraLink,
          blinkitLink: settings.blinkitLink,
          zeptoLink: settings.zeptoLink,
        }}
        onChange={handleChange}
      />

      <TrustBadgesSection
        values={{
          codAvailable: settings.codAvailable,
          customerCount: settings.customerCount,
          rating: settings.rating,
          supportHoursStart: settings.supportHoursStart,
          supportHoursEnd: settings.supportHoursEnd,
        }}
        onChange={(field, value) => setSettings((prev) => ({ ...prev, [field]: value }))}
      />

      {/* SEO Settings */}
      <Card>
        <CardHeader>
          <CardTitle>SEO Settings</CardTitle>
          <CardDescription>Search engine optimization metadata</CardDescription>
        </CardHeader>
        <CardContent className={cardBody}>
          <div className={fieldStyle}>
            <Label htmlFor="metaTitle">Meta Title</Label>
            <Input
              id="metaTitle"
              value={settings.metaTitle || ""}
              onChange={(e) => handleChange("metaTitle", e.target.value)}
              placeholder="lavindia - Premium Jewelry Collection"
            />
          </div>

          <div className={fieldStyle}>
            <Label htmlFor="metaDescription">Meta Description</Label>
            <Textarea
              id="metaDescription"
              value={settings.metaDescription || ""}
              onChange={(e) => handleChange("metaDescription", e.target.value)}
              placeholder="Discover exquisite jewelry pieces from lavindia..."
              rows={3}
            />
          </div>

          <div className={fieldStyle}>
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
        <CardContent className={cardBody}>
          <div className={fieldStyle}>
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

      <div className={footerRow}>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className={spinnerStyle} />}
          Save Changes
        </Button>
      </div>
    </form>
  );
}
