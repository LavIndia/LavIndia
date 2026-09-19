"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useSiteSettings } from "@/components/providers/SiteSettingsProvider";
import { css } from "styled-system/css";
import { motion } from "motion/react";

const overlayStyle = css({
  position: "fixed",
  inset: 0,
  background: "rgba(18, 17, 16, 0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: "50",
  padding: "4",
});
const cardStyle = css({
  background: "bg.glassStrong",
  backdropBlur: "glass",
  border: "1px solid",
  borderColor: "border.glass",
  boxShadow: "glassLg",
  borderRadius: "xl",
  padding: "6",
  maxWidth: "sm",
  width: "full",
});
const contentStyle = css({ textAlign: "center" });
const iconWrapStyle = css({ marginBottom: "4" });
const iconCircleStyle = css({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "16",
  height: "16",
  borderRadius: "full",
  background: "gold.50",
});
const spinnerStyle = css({ width: "8", height: "8", color: "accent.default" });
const headingStyle = css({
  fontFamily: "display",
  fontSize: "lg",
  fontWeight: "semibold",
  color: "fg.default",
  marginBottom: "2",
});
const subTextStyle = css({ fontSize: "sm", color: "fg.muted", marginBottom: "4" });
const orderNumStyle = css({ fontSize: "xs", color: "fg.muted" });

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
    /** Opens the gateway straight on this instrument's screen. */
    method?: "upi" | "card" | "netbanking" | "wallet";
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
  /**
   * What the customer chose at checkout. Both settle through the same
   * gateway; this only saves them a tap by opening on the right screen.
   */
  preferredMethod?: "upi" | "card";
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
  preferredMethod,
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
          // Honours the choice already made at checkout, so the customer is
          // not asked the same question twice.
          ...(preferredMethod ? { method: preferredMethod } : {}),
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
    <div className={overlayStyle}>
      <motion.div
        className={cardStyle}
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
      >
        <div className={contentStyle}>
          <div className={iconWrapStyle}>
            <div className={iconCircleStyle}>
              <motion.svg
                className={spinnerStyle}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, ease: "linear", repeat: Infinity }}
              >
                <circle
                  opacity={0.25}
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  opacity={0.75}
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </motion.svg>
            </div>
          </div>
          <h3 className={headingStyle}>
            {razorpayLoaded ? "Opening secure payment…" : "Preparing secure payment…"}
          </h3>
          <p className={subTextStyle}>
            One moment while your payment is set up
          </p>
          <p className={orderNumStyle}>Order #{orderNumber}</p>
        </div>
      </motion.div>
    </div>
  );
}
