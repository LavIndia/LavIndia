"use client";

import { useState } from "react";
import { Ticket, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Discount {
  id: string;
  code: string;
  title: string;
  description: string | null;
  discountType: string;
  discountValue: number;
  minPurchase: number | null;
  endDate: string | Date;
}

export function CouponsSection({ coupons }: { coupons: Discount[] }) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success("Coupon code copied!");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const formatDiscount = (type: string, value: number) => {
    if (type === "PERCENTAGE") {
      return `${value}% OFF`;
    }
    return `₹${value / 100} OFF`;
  };

  if (coupons.length === 0) {
    return null;
  }

  return (
    <section className="py-16 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 mb-4">
              <Ticket className="h-8 w-8 text-purple-600" />
              <h2 className="text-3xl font-bold text-gray-900">
                Coupons for You
              </h2>
            </div>
            <p className="text-gray-600">
              Save more with our exclusive discount codes
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {coupons.map((coupon) => (
              <div
                key={coupon.id}
                className="relative bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow overflow-hidden border-2 border-dashed border-purple-200"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-400 to-pink-400 rounded-bl-full opacity-10" />

                <div className="p-6 relative">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-xl text-gray-900 mb-1">
                        {coupon.title}
                      </h3>
                      {coupon.description && (
                        <p className="text-sm text-gray-600">
                          {coupon.description}
                        </p>
                      )}
                    </div>
                    <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold px-4 py-2 rounded-lg text-sm shadow-md">
                      {formatDiscount(
                        coupon.discountType,
                        coupon.discountValue
                      )}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-gray-100 rounded-lg px-4 py-3 border-2 border-dashed border-gray-300">
                      <p className="text-xs text-gray-500 mb-1">Coupon Code</p>
                      <p className="font-mono font-bold text-lg text-gray-900">
                        {coupon.code}
                      </p>
                    </div>
                    <Button
                      onClick={() => copyCode(coupon.code)}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    >
                      {copiedCode === coupon.code ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
                    {coupon.minPurchase && (
                      <span>Min. purchase: ₹{coupon.minPurchase / 100}</span>
                    )}
                    <span>
                      Valid till:{" "}
                      {new Date(coupon.endDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
