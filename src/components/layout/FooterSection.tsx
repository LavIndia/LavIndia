"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSiteSettings } from "@/components/providers/SiteSettingsProvider";
import { css } from "styled-system/css";

const footerStyle = css({
  borderTop: "1px solid",
  borderColor: "border.subtle",
  background: "bg.surface",
  paddingBlock: "10",
  paddingInline: { base: "4", md: "6" },
});

const containerStyle = css({ maxWidth: "1440px", marginInline: "auto" });

const mainGridStyle = css({
  display: "grid",
  gridTemplateColumns: { base: "1fr", lg: "1fr 1fr" },
  gap: "8",
  marginBottom: "10",
});

const contactBlockStyle = css({ display: "flex", flexDirection: "column", gap: "4" });
const brandNameStyle = css({
  fontFamily: "display",
  fontSize: "xl",
  fontWeight: "semibold",
  color: "fg.default",
  marginBottom: "1",
});
const taglineStyle = css({ fontSize: "md", fontWeight: "medium", color: "fg.default", marginBottom: "2" });
const contactListStyle = css({ display: "flex", flexDirection: "column", gap: "1.5", fontSize: "sm", color: "fg.muted" });
const contactLabelStyle = css({ fontWeight: "medium", color: "fg.default" });

const navGridStyle3 = css({
  display: "grid",
  gridTemplateColumns: { base: "1fr", sm: "repeat(3, 1fr)" },
  gap: "6",
});
const navGridStyle2 = css({
  display: "grid",
  gridTemplateColumns: { base: "1fr", sm: "repeat(2, 1fr)" },
  gap: "6",
});
const navHeadingStyle = css({ fontFamily: "body", fontSize: "sm", fontWeight: "semibold", color: "fg.default", marginBottom: "3" });
const navListStyle = css({ display: "flex", flexDirection: "column", gap: "2" });
const navLinkStyle = css({
  fontSize: "sm",
  color: "fg.muted",
  transition: "color 0.15s ease",
  display: "block",
  "&:hover, &[data-hovered]": { color: "accent.pressed" },
});
const availableOnListStyle = css({ display: "flex", flexDirection: "column", gap: "1.5", fontSize: "sm", color: "fg.muted" });
const availableOnLinkStyle = css({
  display: "block",
  transition: "color 0.15s ease",
  "&:hover, &[data-hovered]": { color: "accent.pressed" },
});

const newsletterSectionStyle = css({ marginBottom: "10" });
const newsletterCardStyle = css({
  maxWidth: "26rem",
  marginInline: "auto",
  textAlign: "center",
  background: "bg.glass",
  backdropBlur: "glass",
  border: "1px solid",
  borderColor: "border.glass",
  borderRadius: "xl",
  boxShadow: "glass",
  padding: { base: "6", md: "8" },
});
const newsletterHeadingStyle = css({ fontFamily: "display", fontSize: "lg", fontWeight: "semibold", color: "fg.default", marginBottom: "2" });
const newsletterCopyStyle = css({ fontSize: "sm", color: "fg.muted", marginBottom: "4" });
const newsletterFormStyle = css({
  display: "flex",
  flexDirection: { base: "column", sm: "row" },
  gap: "2",
  maxWidth: "24rem",
  marginInline: "auto",
});
const newsletterInputStyle = css({ height: "10", flex: "1" });
const newsletterButtonStyle = css({ height: "10", paddingInline: "6" });

const bottomBarStyle = css({
  borderTop: "1px solid",
  borderColor: "border.subtle",
  paddingTop: "6",
  textAlign: "center",
});
const bottomTextStyle = css({ fontSize: "sm", color: "fg.muted" });

export function FooterSection() {
  const {
    businessName,
    copyrightText,
    contactNumber,
    contactEmail,
    address,
    gstNumber,
    amazonLink,
    flipkartLink,
    myntraLink,
    blinkitLink,
    zeptoLink,
  } = useSiteSettings();
  const marketplaceLinks = [
    { name: "Amazon", url: amazonLink },
    { name: "Myntra", url: myntraLink },
    { name: "Flipkart", url: flipkartLink },
    { name: "Blinkit", url: blinkitLink },
    { name: "Zepto", url: zeptoLink },
  ].filter((m): m is { name: string; url: string } => !!m.url);
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast.error(data.error || "Could not subscribe. Please try again.");
        return;
      }

      toast.success("You're subscribed! Watch your inbox for new stories and offers.");
      setEmail("");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <footer className={footerStyle}>
      <div className={containerStyle}>
        {/* Main Footer Content */}
        <div className={mainGridStyle}>
          {/* Contact Section - Left Side */}
          <div className={contactBlockStyle}>
            <div>
              <h3 className={brandNameStyle}>{businessName}</h3>
              <p className={taglineStyle}>{businessName}</p>
            </div>

            <div className={contactListStyle}>
              {address && (
                <p>
                  <span className={contactLabelStyle}>Address:</span> {address}
                </p>
              )}
              {contactNumber && (
                <p>
                  <span className={contactLabelStyle}>Contact:</span> {contactNumber}
                </p>
              )}
              {contactEmail && (
                <p>
                  <span className={contactLabelStyle}>Email:</span> {contactEmail}
                </p>
              )}
              {gstNumber && (
                <p>
                  <span className={contactLabelStyle}>GSTIN:</span> {gstNumber}
                </p>
              )}
            </div>
          </div>

          {/* Footer Navigation - Right Side */}
          <div className={marketplaceLinks.length > 0 ? navGridStyle3 : navGridStyle2}>
            {/* Explore Section */}
            <div>
              <h4 className={navHeadingStyle}>Explore</h4>
              <nav className={navListStyle}>
                <Link href="/contact" className={navLinkStyle}>
                  Contact Us
                </Link>
                <Link href="/story" className={navLinkStyle}>
                  Story
                </Link>
                <Link href="/core-values" className={navLinkStyle}>
                  Core Values
                </Link>
                <Link href="/faq" className={navLinkStyle}>
                  FAQ
                </Link>
              </nav>
            </div>

            {/* Policies & Help Section */}
            <div>
              <h4 className={navHeadingStyle}>Policies & Help</h4>
              <nav className={navListStyle}>
                <Link href="/privacy-policy" className={navLinkStyle}>
                  Privacy Policy
                </Link>
                <Link href="/terms-conditions" className={navLinkStyle}>
                  Terms & Conditions
                </Link>
                <Link href="/shipping-policy" className={navLinkStyle}>
                  Shipping Policy
                </Link>
                <Link href="/return-exchange" className={navLinkStyle}>
                  Return/Exchange
                </Link>
              </nav>
            </div>

            {/* Also Available On */}
            {marketplaceLinks.length > 0 && (
              <div>
                <h4 className={navHeadingStyle}>Also Available On</h4>
                <div className={availableOnListStyle}>
                  {marketplaceLinks.map((marketplace) => (
                    <a
                      key={marketplace.name}
                      href={marketplace.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={availableOnLinkStyle}
                    >
                      {marketplace.name}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Newsletter Signup Section */}
        <div className={newsletterSectionStyle}>
          <div className={newsletterCardStyle}>
            <h4 className={newsletterHeadingStyle}>Newsletter Signup</h4>
            <p className={newsletterCopyStyle}>
              Sign up for new stories and personal offers
            </p>
            <form onSubmit={handleNewsletterSubmit} className={newsletterFormStyle}>
              <Input
                type="email"
                placeholder="Enter your email"
                className={newsletterInputStyle}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                required
              />
              <Button type="submit" className={newsletterButtonStyle} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className={css({ height: "4", width: "4", marginRight: "2", animation: "spin" })} />
                    Subscribing...
                  </>
                ) : (
                  "Subscribe"
                )}
              </Button>
            </form>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className={bottomBarStyle}>
          <p className={bottomTextStyle}>{copyrightText}</p>
        </div>
      </div>
    </footer>
  );
}
