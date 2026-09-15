"use client";

import { HeaderSection } from "@/components/layout/HeaderSection";
import { FooterSection } from "@/components/layout/FooterSection";
import TopPromoBanner from "@/components/home/TopPromoBanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { XCircle, AlertTriangle, Mail } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function OrderFailedContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("order");
  const reason =
    searchParams.get("reason") || "Payment was cancelled or failed";

  return (
    <div className="min-h-screen bg-white">
      <TopPromoBanner />
      <HeaderSection />
      <main className="py-12">
        <div className="container mx-auto px-4 max-w-3xl">
          {/* Failed Icon & Message */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-red-100 p-6">
                <XCircle className="h-16 w-16 text-red-600" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Order Not Completed
            </h1>
            <p className="text-gray-600">
              We couldn&apos;t complete your order. Don&apos;t worry, no charges
              have been made to your account.
            </p>
          </div>

          {/* Order Details Card */}
          {orderNumber && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Order Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Order Number:</span>
                  <span className="font-mono font-semibold">{orderNumber}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                    Payment Failed
                  </span>
                </div>
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-900">Reason</p>
                    <p className="text-sm text-amber-700">{reason}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* What Can You Do */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>What Can You Do?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold mb-1">1. Try Again</h3>
                  <p className="text-sm text-gray-600">
                    Return to your cart and try placing the order again. Your
                    items are still saved.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">
                    2. Choose a Different Payment Method
                  </h3>
                  <p className="text-sm text-gray-600">
                    Try using a different payment method like Cash on Delivery
                    (COD) or a different card/UPI.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">3. Contact Support</h3>
                  <p className="text-sm text-gray-600">
                    If you continue to face issues, our support team is here to
                    help.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild className="flex-1">
              <Link href="/checkout">Try Again</Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link href="/">Continue Shopping</Link>
            </Button>
          </div>

          {/* Contact Support */}
          <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-gray-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900 mb-1">
                  Need Help?
                </p>
                <p className="text-sm text-gray-600">
                  Contact our support team at{" "}
                  <a
                    href="mailto:support@lavishindia.com"
                    className="text-blue-600 hover:underline"
                  >
                    support@lavishindia.com
                  </a>{" "}
                  or call us at{" "}
                  <a
                    href="tel:+911234567890"
                    className="text-blue-600 hover:underline"
                  >
                    +91 123 456 7890
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <FooterSection />
    </div>
  );
}

export default function OrderFailedPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <p>Loading...</p>
        </div>
      }
    >
      <OrderFailedContent />
    </Suspense>
  );
}
