"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import colors from "@/styles/colors";
import { designSystem } from "@/styles/design-system";
import { useSiteSettings } from "@/components/providers/SiteSettingsProvider";

export function FooterSection() {
  const { businessName, copyrightText } = useSiteSettings();

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle newsletter signup logic here
    console.log("Newsletter signup submitted");
  };

  return (
    <footer className="border-t bg-white py-8 px-6">
      <div className="container mx-auto">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Contact Section - Left Side */}
          <div className="space-y-4">
            <div>
              <h3
                className={`${designSystem.fontSize.xl} font-semibold text-gray-900 mb-2`}
              >
                {businessName}
              </h3>
              <p
                className={`${designSystem.fontSize.lg} font-medium text-gray-800 mb-4`}
              >
                {businessName}
              </p>
            </div>

            <div className="space-y-2 text-sm text-gray-600">
              <p>
                <span className="font-medium">Address:</span> India
              </p>
              <p>
                <span className="font-medium">Contact:</span> 1234565
              </p>
              <p>
                <span className="font-medium">Email:</span> xyz@gmail.com
              </p>
              <p>
                <span className="font-medium">GSTIN:</span> 678908767
              </p>
            </div>
          </div>

          {/* Footer Navigation - Right Side */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* Explore Section */}
            <div>
              <h4
                className={`${designSystem.fontSize.base} font-semibold text-gray-900 mb-3`}
              >
                Explore
              </h4>
              <nav className="space-y-2">
                <Link
                  href="/contact"
                  className={`${designSystem.fontSize.sm} text-gray-600 hover:text-[${colors.accentGold}] transition-colors block`}
                >
                  Contact Us
                </Link>
                <Link
                  href="/story"
                  className={`${designSystem.fontSize.sm} text-gray-600 hover:text-[${colors.accentGold}] transition-colors block`}
                >
                  Story
                </Link>
                <Link
                  href="/core-values"
                  className={`${designSystem.fontSize.sm} text-gray-600 hover:text-[${colors.accentGold}] transition-colors block`}
                >
                  Core Values
                </Link>
                <Link
                  href="/faq"
                  className={`${designSystem.fontSize.sm} text-gray-600 hover:text-[${colors.accentGold}] transition-colors block`}
                >
                  FAQ
                </Link>
              </nav>
            </div>

            {/* Policies & Help Section */}
            <div>
              <h4
                className={`${designSystem.fontSize.base} font-semibold text-gray-900 mb-3`}
              >
                Policies & Help
              </h4>
              <nav className="space-y-2">
                <Link
                  href="/privacy-policy"
                  className={`${designSystem.fontSize.sm} text-gray-600 hover:text-[${colors.accentGold}] transition-colors block`}
                >
                  Privacy Policy
                </Link>
                <Link
                  href="/terms-conditions"
                  className={`${designSystem.fontSize.sm} text-gray-600 hover:text-[${colors.accentGold}] transition-colors block`}
                >
                  Terms & Conditions
                </Link>
                <Link
                  href="/shipping-policy"
                  className={`${designSystem.fontSize.sm} text-gray-600 hover:text-[${colors.accentGold}] transition-colors block`}
                >
                  Shipping Policy
                </Link>
                <Link
                  href="/return-exchange"
                  className={`${designSystem.fontSize.sm} text-gray-600 hover:text-[${colors.accentGold}] transition-colors block`}
                >
                  Return/Exchange
                </Link>
              </nav>
            </div>

            {/* Also Available On */}
            <div>
              <h4
                className={`${designSystem.fontSize.base} font-semibold text-gray-900 mb-3`}
              >
                Also Available On
              </h4>
              <div className="space-y-2 text-sm text-gray-600">
                <p>Amazon</p>
                <p>Myntra</p>
                <p>Flipkart</p>
                <p>Blinkit</p>
                <p>Zepto</p>
              </div>
            </div>
          </div>
        </div>

        {/* Newsletter Signup Section */}
        <div className="mb-8">
          <div className="max-w-md mx-auto text-center">
            <h4
              className={`${designSystem.fontSize.base} font-semibold text-gray-900 mb-3`}
            >
              Newsletter Signup
            </h4>
            <p className={`${designSystem.fontSize.sm} text-gray-600 mb-4`}>
              Sign up for new stories and personal offers
            </p>
            <form
              onSubmit={handleNewsletterSubmit}
              className="flex gap-2 max-w-sm mx-auto"
            >
              <Input
                type="email"
                placeholder="Enter your email"
                className={`${designSystem.componentHeight.sm} flex-1`}
                required
              />
              <Button
                type="submit"
                className={`bg-[${colors.accentGold}] hover:bg-[${colors.accentGoldHover}] ${designSystem.componentHeight.sm} px-6`}
              >
                Subscribe
              </Button>
            </form>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="border-t pt-6 text-center">
          <p className={`${designSystem.fontSize.sm} text-gray-600`}>
            {copyrightText}
          </p>
        </div>
      </div>
    </footer>
  );
}
