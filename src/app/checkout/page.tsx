"use client";

import { HeaderSection } from "@/components/layout/HeaderSection";
import { FooterSection } from "@/components/layout/FooterSection";
import TopPromoBanner from "@/components/home/TopPromoBanner";
import { BreadcrumbNavigation } from "@/components/layout/BreadcrumbNavigation";
import { useCart } from "@/components/cart/useCart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import RazorpayCheckout from "@/components/payment/RazorpayCheckout";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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
    shippingMethod: "standard",
    paymentMethod: "cod", // cash on delivery by default
  });

  const [isProcessing, setIsProcessing] = useState(false);
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

  const tax = useMemo(() => 0, []); // placeholder, GST/VAT can be calculated later

  const grandTotal = useMemo(
    () => totalPrice + shippingFee + tax,
    [totalPrice, shippingFee, tax]
  );

  const grandTotalCents = useMemo(() => grandTotal * 100, [grandTotal]);

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
      const orderPayload = {
        addressId: address.id,
        paymentMethod: form.paymentMethod,
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

      // Step 3: Handle payment method
      if (form.paymentMethod === "cod") {
        // COD: Order is already created and processing
        toast.success("Order placed successfully!");
        clear();
        router.push(`/order-success?order=${order.orderNumber}`);
      } else if (form.paymentMethod === "razorpay") {
        // Razorpay: Show Razorpay checkout component
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
    <div className="min-h-screen bg-white">
      <TopPromoBanner />
      <HeaderSection />
      <main className="py-8">
        <div className="container mx-auto px-4">
          {/* Breadcrumb */}
          <div className="mb-6">
            <BreadcrumbNavigation />
          </div>

          {/* Page Title */}
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Details */}
            <div className="lg:col-span-2 space-y-8">
              <section className="space-y-4">
                <h2 className="text-xl font-semibold">Contact</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              <section className="space-y-4">
                <h2 className="text-xl font-semibold">Shipping address</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Input
                      placeholder="Address line 1"
                      value={form.address1}
                      onChange={(e) =>
                        setForm({ ...form, address1: e.target.value })
                      }
                    />
                  </div>
                  <div className="md:col-span-2">
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
                  <div className="md:col-span-2">
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

              <section className="space-y-4">
                <h2 className="text-xl font-semibold">Shipping method</h2>
                <div className="grid grid-cols-1 gap-3">
                  <label className="flex items-center justify-between border rounded-md p-3 cursor-pointer hover:bg-gray-50">
                    <span className="text-sm">Standard (3-7 days)</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">₹99</span>
                      <input
                        type="radio"
                        name="shipping"
                        checked={form.shippingMethod === "standard"}
                        onChange={() =>
                          setForm({ ...form, shippingMethod: "standard" })
                        }
                      />
                    </div>
                  </label>
                  <label className="flex items-center justify-between border rounded-md p-3 cursor-pointer hover:bg-gray-50">
                    <span className="text-sm">Express (1-2 days)</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">₹199</span>
                      <input
                        type="radio"
                        name="shipping"
                        checked={form.shippingMethod === "express"}
                        onChange={() =>
                          setForm({ ...form, shippingMethod: "express" })
                        }
                      />
                    </div>
                  </label>
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold">Payment</h2>
                <div className="grid grid-cols-1 gap-3">
                  <label className="flex items-center justify-between border rounded-md p-3 cursor-pointer hover:bg-gray-50">
                    <span className="text-sm">Cash on Delivery (COD)</span>
                    <input
                      type="radio"
                      name="payment"
                      checked={form.paymentMethod === "cod"}
                      onChange={() =>
                        setForm({ ...form, paymentMethod: "cod" })
                      }
                    />
                  </label>
                  <label className="flex items-center justify-between border rounded-md p-3 cursor-pointer hover:bg-gray-50">
                    <span className="text-sm">
                      Card / UPI / Wallet (Razorpay)
                    </span>
                    <input
                      type="radio"
                      name="payment"
                      checked={form.paymentMethod === "razorpay"}
                      onChange={() =>
                        setForm({ ...form, paymentMethod: "razorpay" })
                      }
                    />
                  </label>
                </div>
              </section>
            </div>

            {/* Right: Order Summary */}
            <aside className="lg:col-span-1 border rounded-md p-4 h-fit sticky top-24">
              <h3 className="text-lg font-semibold mb-4">Order Summary</h3>
              <div className="space-y-3 max-h-[50vh] overflow-auto pr-2">
                {items.length === 0 ? (
                  <p className="text-sm text-gray-500">Your cart is empty.</p>
                ) : (
                  items.map((it) => (
                    <div
                      key={`${it.id}:${it.variantId ?? "_"}`}
                      className="flex items-center justify-between"
                    >
                      <div className="text-sm truncate mr-2">
                        {it.name}
                        {it.variantId ? (
                          <span className="text-gray-500">
                            {" "}
                            · {it.variantId}
                          </span>
                        ) : null}
                        <span className="text-gray-500"> × {it.qty}</span>
                      </div>
                      <div className="text-sm font-medium">
                        ₹{(it.qty * it.price).toLocaleString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>Subtotal</span>
                  <span className="font-medium">
                    ₹{totalPrice.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Shipping</span>
                  <span className="font-medium">
                    ₹{shippingFee.toLocaleString()}
                  </span>
                </div>
                {tax > 0 && (
                  <div className="flex items-center justify-between">
                    <span>Tax</span>
                    <span className="font-medium">₹{tax.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-base pt-2 border-t">
                  <span className="font-semibold">Total</span>
                  <span className="font-semibold">
                    ₹{grandTotal.toLocaleString()}
                  </span>
                </div>
              </div>

              <Button
                className="w-full mt-4"
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
              <Button asChild variant="outline" className="w-full mt-2">
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
