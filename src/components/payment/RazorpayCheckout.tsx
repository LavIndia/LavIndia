"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useSiteSettings } from "@/components/providers/SiteSettingsProvider";

// Razorpay TypeScript declarations
interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  image?: string;
  order_id: string;
  handler: (response: RazorpayResponse) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => {
      open: () => void;
    };
  }
}

interface RazorpayCheckoutProps {
  orderId: string;
  orderNumber: string;
  amount: number;
  currency?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  onSuccess: () => void;
  onFailure: () => void;
  onCancel: () => void;
}

export default function RazorpayCheckout({
  orderId,
  orderNumber,
  amount,
  currency = "INR",
  customerName,
  customerEmail,
  customerPhone,
  onSuccess,
  onFailure,
  onCancel,
}: RazorpayCheckoutProps) {
  const { businessName } = useSiteSettings();
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => {
      console.log("Razorpay SDK loaded successfully");
      setRazorpayLoaded(true);
    };
    script.onerror = () => {
      console.error("Failed to load Razorpay SDK");
      toast.error("Payment gateway failed to load");
    };
    document.body.appendChild(script);

    return () => {
      // Cleanup script on unmount
      const existingScript = document.querySelector(
        'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
      );
      if (existingScript) {
        document.body.removeChild(existingScript);
      }
    };
  }, []);

  const initiatePayment = async () => {
    console.log("Starting Razorpay payment flow...");
    setIsProcessing(true);

    try {
      if (!razorpayLoaded) {
        console.error("Razorpay SDK not loaded");
        toast.error(
          "Payment gateway not loaded. Please refresh and try again."
        );
        onFailure();
        return;
      }

      if (!window.Razorpay) {
        console.error("Razorpay object not available");
        toast.error(
          "Payment gateway not available. Please refresh and try again."
        );
        onFailure();
        return;
      }

      console.log("Creating Razorpay order with amount:", amount);

      // Create Razorpay order
      const razorpayOrderResponse = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountCents: amount,
          currency: currency,
          notes: {
            orderNumber: orderNumber,
            orderId: orderId,
          },
        }),
      });

      const responseData = await razorpayOrderResponse.json();

      if (!razorpayOrderResponse.ok) {
        console.error("Razorpay order creation failed:", responseData);
        toast.error(
          "Payment gateway temporarily unavailable. Order placed as pending."
        );
        onFailure();
        return;
      }

      const { orderId: razorpayOrderId, keyId } = responseData;

      if (!razorpayOrderId || !keyId) {
        console.error("Missing Razorpay credentials");
        toast.error("Payment gateway not configured properly.");
        onFailure();
        return;
      }

      console.log("Razorpay order created:", razorpayOrderId);

      // Configure Razorpay options
      const options: RazorpayOptions = {
        key: keyId,
        amount: amount,
        currency: currency,
        name: businessName,
        description: `Order #${orderNumber}`,
        image: "/assets/pictures/logo.png",
        order_id: razorpayOrderId,
        handler: async (response: RazorpayResponse) => {
          console.log("Payment successful, verifying...");
          try {
            // Verify payment
            const verifyResponse = await fetch("/api/payment/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                orderId: orderId,
              }),
            });

            if (!verifyResponse.ok) {
              throw new Error("Payment verification failed");
            }

            console.log("Payment verified successfully");
            toast.success("Payment successful!");
            onSuccess();
          } catch (error) {
            console.error("Payment verification error:", error);
            toast.error("Payment verification failed");
            onFailure();
          }
        },
        prefill: {
          name: customerName,
          email: customerEmail,
          contact: customerPhone,
        },
        notes: {
          orderNumber: orderNumber,
        },
        theme: {
          color: "#000000",
        },
        modal: {
          ondismiss: () => {
            console.log("Payment modal dismissed");
            toast.error("Payment cancelled");
            onCancel();
          },
        },
      };

      console.log("Opening Razorpay payment modal...");
      const razorpay = new window.Razorpay(options);
      razorpay.open();
      console.log("Razorpay modal opened");
    } catch (error) {
      console.error("Razorpay initialization error:", error);
      toast.error("Payment gateway error. Please contact support.");
      onFailure();
    }
  };

  // Auto-initiate payment when script is loaded
  useEffect(() => {
    if (razorpayLoaded && !isProcessing) {
      initiatePayment();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [razorpayLoaded]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
        <div className="text-center">
          <div className="mb-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
              <svg
                className="w-8 h-8 text-blue-600 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {razorpayLoaded
              ? "Opening Payment Gateway..."
              : "Loading Payment Gateway..."}
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Please wait while we redirect you to secure payment
          </p>
          <p className="text-xs text-gray-500">Order #{orderNumber}</p>
        </div>
      </div>
    </div>
  );
}
