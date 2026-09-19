"use client";

import { HeaderSection } from "@/components/layout/HeaderSection";
import { FooterSection } from "@/components/layout/FooterSection";
import TopPromoBanner from "@/components/home/TopPromoBanner";
import { BreadcrumbNavigation } from "@/components/layout/BreadcrumbNavigation";
import { useCart } from "@/components/cart/useCart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import RazorpayCheckout from "@/components/payment/RazorpayCheckout";
import { useSiteSettings } from "@/components/providers/SiteSettingsProvider";
import {
  PaymentMethodChoice,
  isOnlinePayment,
  type CheckoutPaymentChoice,
} from "@/components/checkout/PaymentMethodChoice";
import {
  ShippingMethodChoice,
  type CheckoutShippingChoice,
} from "@/components/checkout/ShippingMethodChoice";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { css } from "styled-system/css";

const pageStyle = css({ minHeight: "100vh", background: "bg.canvas" });
const mainStyle = css({ paddingBlock: { base: "6", md: "10" } });
const containerStyle = css({
  maxWidth: "7xl",
  marginInline: "auto",
  paddingInline: { base: "4", md: "6" },
});
const crumbStyle = css({ marginBottom: "6" });
const titleStyle = css({
  fontFamily: "display",
  fontSize: { base: "2xl", md: "3xl" },
  fontWeight: "bold",
  color: "fg.default",
  marginBottom: { base: "6", md: "8" },
});

const gridStyle = css({
  display: "grid",
  gridTemplateColumns: { base: "1fr", lg: "2fr 1fr" },
  gap: { base: "8", lg: "10" },
});

const detailsColStyle = css({ display: "flex", flexDirection: "column", gap: "8" });
const sectionStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "4",
  padding: { base: "4", md: "6" },
  borderRadius: "lg",
  background: "bg.glass",
  backdropBlur: "glassSm",
  border: "1px solid",
  borderColor: "border.glass",
  boxShadow: "glass",
});
const sectionHeadingStyle = css({
  fontFamily: "display",
  fontSize: "lg",
  fontWeight: "semibold",
  color: "fg.default",
});
const fieldGridStyle = css({
  display: "grid",
  gridTemplateColumns: { base: "1fr", md: "1fr 1fr" },
  gap: "4",
});
const fieldSpanStyle = css({ gridColumn: { md: "1 / -1" } });


const asideStyle = css({
  gridColumn: { lg: "2" },
  borderRadius: "lg",
  padding: "4",
  height: "fit-content",
  position: { lg: "sticky" },
  top: { lg: "24" },
  background: "bg.glassStrong",
  backdropBlur: "glass",
  border: "1px solid",
  borderColor: "border.glass",
  boxShadow: "glass",
});
const asideHeadingStyle = css({
  fontFamily: "display",
  fontSize: "md",
  fontWeight: "semibold",
  color: "fg.default",
  marginBottom: "4",
});
const itemsListStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "3",
  maxHeight: "50vh",
  overflow: "auto",
  paddingRight: "2",
});
const emptyCartStyle = css({ fontSize: "sm", color: "fg.muted" });
const itemRowStyle = css({ display: "flex", alignItems: "center", justifyContent: "space-between" });
const itemNameStyle = css({ fontSize: "sm", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: "2", color: "fg.default" });
const itemMutedStyle = css({ color: "fg.muted" });
const itemPriceStyle = css({ fontSize: "sm", fontWeight: "medium", color: "fg.default" });

const couponRowStyle = css({ display: "flex", gap: "2", marginTop: "4" });
const couponAppliedStyle = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "2",
  marginTop: "4",
  padding: "2.5",
  borderRadius: "md",
  background: "rgba(47,107,88,0.08)",
  border: "1px solid",
  borderColor: "rgba(47,107,88,0.25)",
  fontSize: "sm",
});
const couponRemoveStyle = css({
  color: "fg.muted",
  fontSize: "xs",
  textDecoration: "underline",
  cursor: "pointer",
  background: "transparent",
  border: "none",
});
const discountValueStyle = css({ fontWeight: "medium", color: "success" });

const totalsStyle = css({ marginTop: "4", display: "flex", flexDirection: "column", gap: "2", fontSize: "sm" });
const totalsRowStyle = css({ display: "flex", alignItems: "center", justifyContent: "space-between" });
const totalsLabelStyle = css({ color: "fg.default" });
const totalsValueStyle = css({ fontWeight: "medium", color: "fg.default" });
const grandTotalRowStyle = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  fontSize: "md",
  paddingTop: "2",
  borderTop: "1px solid",
  borderColor: "border.subtle",
});
const grandTotalLabelStyle = css({ fontFamily: "display", fontWeight: "semibold", color: "fg.default" });
const grandTotalValueStyle = css({ fontFamily: "display", fontWeight: "semibold", fontSize: "lg", color: "fg.default" });

const placeOrderBtnStyle = css({ width: "full", marginTop: "4" });
const continueBtnStyle = css({ width: "full", marginTop: "2" });

export default function CheckoutPage() {
  const { items, totalPrice, totalCount, clear } = useCart();
  const { data: session } = useSession();
  const router = useRouter();

  const [form, setForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    postalCode: "",
    phone: "",
    shippingMethod: "standard" as CheckoutShippingChoice,
    // UPI first: it is how most customers here actually pay.
    paymentMethod: "upi" as CheckoutPaymentChoice,
  });

  const { codFeeCents } = useSiteSettings();
  const [isProcessing, setIsProcessing] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    title: string;
    discountCents: number;
  } | null>(null);
  const [showRazorpay, setShowRazorpay] = useState(false);
  const [razorpayData, setRazorpayData] = useState<{
    orderId: string;
    orderNumber: string;
    amount: number;
  } | null>(null);

  // Pre-fill form from session and saved addresses
  useEffect(() => {
    const fetchUserData = async () => {
      if (session?.user) {
        // Pre-fill basic user info
        setForm((prev) => ({
          ...prev,
          email: session.user.email || prev.email,
          firstName: session.user.name?.split(" ")[0] || prev.firstName,
          lastName:
            session.user.name?.split(" ").slice(1).join(" ") || prev.lastName,
        }));

        // Fetch and pre-fill default address
        try {
          const response = await fetch("/api/user/address");
          if (response.ok) {
            const { addresses } = await response.json();
            const defaultAddress =
              addresses.find(
                (addr: { isDefault: boolean }) => addr.isDefault
              ) || addresses[0];

            if (defaultAddress) {
              setForm((prev) => ({
                ...prev,
                phone: defaultAddress.mobile || prev.phone,
                firstName:
                  defaultAddress.fullName?.split(" ")[0] || prev.firstName,
                lastName:
                  defaultAddress.fullName?.split(" ").slice(1).join(" ") ||
                  prev.lastName,
                address1: defaultAddress.addressLine1 || prev.address1,
                address2: defaultAddress.addressLine2 || prev.address2,
                city: defaultAddress.city || prev.city,
                state: defaultAddress.state || prev.state,
                postalCode: defaultAddress.pincode || prev.postalCode,
              }));
            }
          }
        } catch (error) {
          console.error("Failed to fetch user address:", error);
        }
      }
    };

    fetchUserData();
  }, [session]);

  const shippingFee = useMemo(
    () => (totalPrice > 0 ? (form.shippingMethod === "express" ? 199 : 99) : 0),
    [totalPrice, form.shippingMethod]
  );

  /**
   * What cash on delivery adds to the bill.
   *
   * Charged only when the customer actually chooses to pay cash, and only on
   * a non-empty basket, so an empty checkout never shows a fee for a service
   * nobody has asked for. The rate is the owner's, set in Settings.
   */
  const codFee = useMemo(
    () => (totalPrice > 0 && form.paymentMethod === "cod" ? Math.round(codFeeCents / 100) : 0),
    [totalPrice, form.paymentMethod, codFeeCents],
  );

  const tax = useMemo(() => 0, []); // placeholder, GST/VAT can be calculated later

  const discountRupees = appliedCoupon
    ? Math.round(appliedCoupon.discountCents / 100)
    : 0;

  const grandTotal = useMemo(
    () => Math.max(0, totalPrice + shippingFee + codFee + tax - discountRupees),
    [totalPrice, shippingFee, codFee, tax, discountRupees]
  );

  const grandTotalCents = useMemo(() => grandTotal * 100, [grandTotal]);

  const applyCoupon = async (code: string) => {
    if (!code.trim() || totalPrice <= 0) return;
    setIsApplyingCoupon(true);
    try {
      const res = await fetch("/api/discounts/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, subtotalCents: totalPrice * 100 }),
      });
      const data = await res.json();
      if (!res.ok || !data.valid) {
        setAppliedCoupon(null);
        toast.error(data.error || "Invalid coupon code");
        return;
      }
      setAppliedCoupon({
        code: data.code,
        title: data.title,
        discountCents: data.discountCents,
      });
      toast.success(`Coupon "${data.code}" applied`);
    } catch {
      toast.error("Could not validate coupon right now");
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleApplyCoupon = () => applyCoupon(couponInput);

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
  };

  // Re-validate silently if the cart total changes while a coupon is
  // applied (e.g. quantity edited) — a min-purchase or % amount can go
  // stale otherwise.
  useEffect(() => {
    if (appliedCoupon) {
      applyCoupon(appliedCoupon.code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPrice]);

  const handlePlaceOrder = async () => {
    // Client-side validation
    if (!form.email || !form.firstName || !form.address1 || !form.city) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!session?.user) {
      toast.error("Please sign in to place an order");
      router.push("/");
      return;
    }

    if (items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    setIsProcessing(true);

    try {
      // Step 1: Create address first (if not using existing one)
      const addressResponse = await fetch("/api/user/address", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: `${form.firstName} ${form.lastName}`.trim(),
          mobile: form.phone, // API expects 'mobile' not 'phone'
          addressLine1: form.address1,
          addressLine2: form.address2,
          city: form.city,
          state: form.state,
          pincode: form.postalCode, // API expects 'pincode' not 'postalCode'
          country: "India",
          isDefault: false,
        }),
      });

      if (!addressResponse.ok) {
        throw new Error("Failed to save address");
      }

      const { address } = await addressResponse.json();

      // Step 2: Create order in database
      // The API records the route the money takes, not the instrument: UPI
      // and card both settle through the online gateway, and which one was
      // used is captured against the payment once the gateway confirms it.
      const paidOnline = isOnlinePayment(form.paymentMethod);

      const orderPayload = {
        addressId: address.id,
        paymentMethod: paidOnline ? "razorpay" : "cod",
        shippingMethod: form.shippingMethod,
        items: items.map((item) => {
          const orderItem: {
            productId: string;
            variantId?: string;
            quantity: number;
            priceCents: number;
            name: string;
            image?: string;
          } = {
            productId: item.id,
            quantity: item.qty,
            priceCents: item.price * 100,
            name: item.name,
          };

          // Only include variantId if it exists
          if (item.variantId) {
            orderItem.variantId = item.variantId;
          }

          // Only include image if it exists
          if (item.image) {
            orderItem.image = item.image;
          }

          return orderItem;
        }),
        totalCents: totalPrice * 100,
        shippingCents: shippingFee * 100,
        taxCents: tax * 100,
        discountCode: appliedCoupon?.code,
        notes: "",
      };

      const orderResponse = await fetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload),
      });

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json();
        throw new Error(errorData.error || "Failed to create order");
      }

      const { order } = await orderResponse.json();

      // Step 3: Settle the payment
      if (!paidOnline) {
        // Cash on delivery: the order is already through and processing.
        toast.success("Order placed successfully!");
        clear();
        router.push(`/order-success?order=${order.orderNumber}`);
      } else {
        setRazorpayData({
          orderId: order.id,
          orderNumber: order.orderNumber,
          amount: grandTotalCents,
        });
        setShowRazorpay(true);
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to place order"
      );
      setIsProcessing(false);
    }
  };

  return (
    <div className={pageStyle}>
      <TopPromoBanner />
      <HeaderSection />
      <main className={mainStyle}>
        <div className={containerStyle}>
          {/* Breadcrumb */}
          <div className={crumbStyle}>
            <BreadcrumbNavigation />
          </div>

          {/* Page Title */}
          <h1 className={titleStyle}>Checkout</h1>

          <div className={gridStyle}>
            {/* Left: Details */}
            <div className={detailsColStyle}>
              <section className={sectionStyle}>
                <h2 className={sectionHeadingStyle}>Contact</h2>
                <div className={fieldGridStyle}>
                  <Input
                    placeholder="Email"
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                  />
                  <Input
                    placeholder="Phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                  />
                  <Input
                    placeholder="First name"
                    value={form.firstName}
                    onChange={(e) =>
                      setForm({ ...form, firstName: e.target.value })
                    }
                  />
                  <Input
                    placeholder="Last name"
                    value={form.lastName}
                    onChange={(e) =>
                      setForm({ ...form, lastName: e.target.value })
                    }
                  />
                </div>
              </section>

              <section className={sectionStyle}>
                <h2 className={sectionHeadingStyle}>Shipping address</h2>
                <div className={fieldGridStyle}>
                  <div className={fieldSpanStyle}>
                    <Input
                      placeholder="Address line 1"
                      value={form.address1}
                      onChange={(e) =>
                        setForm({ ...form, address1: e.target.value })
                      }
                    />
                  </div>
                  <div className={fieldSpanStyle}>
                    <Input
                      placeholder="Address line 2 (optional)"
                      value={form.address2}
                      onChange={(e) =>
                        setForm({ ...form, address2: e.target.value })
                      }
                    />
                  </div>
                  <Input
                    placeholder="City"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                  />
                  <Input
                    placeholder="State"
                    value={form.state}
                    onChange={(e) =>
                      setForm({ ...form, state: e.target.value })
                    }
                  />
                  <div className={fieldSpanStyle}>
                    <Input
                      placeholder="Postal code"
                      value={form.postalCode}
                      onChange={(e) =>
                        setForm({ ...form, postalCode: e.target.value })
                      }
                    />
                  </div>
                </div>
              </section>

              <section className={sectionStyle}>
                <h2 className={sectionHeadingStyle}>Shipping method</h2>
                <ShippingMethodChoice
                  value={form.shippingMethod}
                  onChange={(shippingMethod) => setForm({ ...form, shippingMethod })}
                />
              </section>

              <section className={sectionStyle}>
                <h2 className={sectionHeadingStyle}>Payment</h2>
                <PaymentMethodChoice
                  value={form.paymentMethod}
                  onChange={(paymentMethod) => setForm({ ...form, paymentMethod })}
                />
              </section>
            </div>

            {/* Right: Order Summary */}
            <aside className={asideStyle}>
              <h3 className={asideHeadingStyle}>Order Summary</h3>
              <div className={itemsListStyle}>
                {items.length === 0 ? (
                  <p className={emptyCartStyle}>Your cart is empty.</p>
                ) : (
                  items.map((it) => (
                    <div
                      key={`${it.id}:${it.variantId ?? "_"}`}
                      className={itemRowStyle}
                    >
                      <div className={itemNameStyle}>
                        {it.name}
                        {it.variantLabel ? (
                          <span className={itemMutedStyle}>
                            {" "}
                            · {it.variantLabel}
                          </span>
                        ) : null}
                        <span className={itemMutedStyle}> × {it.qty}</span>
                      </div>
                      <div className={itemPriceStyle}>
                        ₹{(it.qty * it.price).toLocaleString()}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {appliedCoupon ? (
                <div className={couponAppliedStyle}>
                  <span>
                    Coupon <strong>{appliedCoupon.code}</strong> applied
                  </span>
                  <button
                    type="button"
                    className={couponRemoveStyle}
                    onClick={handleRemoveCoupon}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className={couponRowStyle}>
                  <Input
                    placeholder="Coupon code"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleApplyCoupon();
                      }
                    }}
                    disabled={items.length === 0}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleApplyCoupon}
                    disabled={isApplyingCoupon || !couponInput.trim() || items.length === 0}
                  >
                    {isApplyingCoupon ? "Checking..." : "Apply"}
                  </Button>
                </div>
              )}

              <div className={totalsStyle}>
                <div className={totalsRowStyle}>
                  <span className={totalsLabelStyle}>Subtotal</span>
                  <span className={totalsValueStyle}>
                    ₹{totalPrice.toLocaleString()}
                  </span>
                </div>
                <div className={totalsRowStyle}>
                  <span className={totalsLabelStyle}>Shipping</span>
                  <span className={totalsValueStyle}>
                    ₹{shippingFee.toLocaleString()}
                  </span>
                </div>
                {/* Shown only when it applies, so a card customer is never
                    told about a fee they are not paying. */}
                {codFee > 0 && (
                  <div className={totalsRowStyle}>
                    <span className={totalsLabelStyle}>Cash on delivery fee</span>
                    <span className={totalsValueStyle}>₹{codFee.toLocaleString()}</span>
                  </div>
                )}
                {tax > 0 && (
                  <div className={totalsRowStyle}>
                    <span className={totalsLabelStyle}>Tax</span>
                    <span className={totalsValueStyle}>₹{tax.toLocaleString()}</span>
                  </div>
                )}
                {appliedCoupon && (
                  <div className={totalsRowStyle}>
                    <span className={totalsLabelStyle}>Discount</span>
                    <span className={discountValueStyle}>
                      −₹{discountRupees.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                <div className={grandTotalRowStyle}>
                  <span className={grandTotalLabelStyle}>Total</span>
                  <span className={grandTotalValueStyle}>
                    ₹{grandTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <Button
                className={placeOrderBtnStyle}
                disabled={
                  items.length === 0 ||
                  !form.email ||
                  !form.firstName ||
                  !form.address1 ||
                  !form.city ||
                  isProcessing
                }
                onClick={handlePlaceOrder}
              >
                {isProcessing ? "Processing..." : `Place order (${totalCount})`}
              </Button>
              <Button asChild variant="outline" className={continueBtnStyle}>
                <Link href="/">Continue shopping</Link>
              </Button>
            </aside>
          </div>
        </div>
      </main>
      <FooterSection />

      {/* Razorpay Checkout Modal */}
      {showRazorpay && razorpayData && (
        <RazorpayCheckout
          orderId={razorpayData.orderId}
          orderNumber={razorpayData.orderNumber}
          amount={razorpayData.amount}
          preferredMethod={form.paymentMethod === "card" ? "card" : "upi"}
          customerName={`${form.firstName} ${form.lastName}`.trim()}
          customerEmail={form.email}
          customerPhone={form.phone}
          onSuccess={() => {
            clear();
            router.push(`/order-success?order=${razorpayData.orderNumber}`);
          }}
          onFailure={() => {
            router.push(`/order-failed?order=${razorpayData.orderNumber}`);
          }}
          onCancel={() => {
            setShowRazorpay(false);
            setIsProcessing(false);
            router.push(`/order-failed?order=${razorpayData.orderNumber}`);
          }}
        />
      )}
    </div>
  );
}
