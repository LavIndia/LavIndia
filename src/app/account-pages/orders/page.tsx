"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { HeaderSection } from "@/components/layout/HeaderSection";
import { FooterSection } from "@/components/layout/FooterSection";
import TopPromoBanner from "@/components/home/TopPromoBanner";
import { BreadcrumbNavigation } from "@/components/layout/BreadcrumbNavigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Package,
  ShoppingBag,
  Clock,
  Truck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  PackageCheck,
} from "lucide-react";
import { css, cva } from "styled-system/css";

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  priceCents: number;
  image: string;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  totalCents: number;
  shippingCents: number;
  createdAt: string;
  items: OrderItem[];
}

// Status pill — tone-based so order status reads at a glance (neutral = pending,
// gold = active/in-progress, success = delivered, danger = cancelled/failed).
const statusPillStyle = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: "1.5",
    borderRadius: "full",
    border: "1px solid",
    paddingInline: "3",
    paddingBlock: "1.5",
    fontSize: "xs",
    fontWeight: "semibold",
    fontFamily: "body",
    whiteSpace: "nowrap",
  },
  variants: {
    tone: {
      neutral: { background: "bg.surface", color: "fg.muted", borderColor: "border.subtle" },
      gold: { background: "gold.50", color: "gold.700", borderColor: "gold.200" },
      success: {
        background: "rgba(47,107,88,0.1)",
        color: "success",
        borderColor: "rgba(47,107,88,0.25)",
      },
      danger: {
        background: "rgba(138,44,59,0.1)",
        color: "danger",
        borderColor: "rgba(138,44,59,0.25)",
      },
    },
  },
  defaultVariants: { tone: "neutral" },
});

type Tone = "neutral" | "gold" | "success" | "danger";

// Order Status Badge Helper
const getOrderStatusBadge = (status: string) => {
  const statusMap: Record<
    string,
    { label: string; tone: Tone; icon: React.ReactElement }
  > = {
    PENDING: {
      label: "Pending",
      tone: "neutral",
      icon: <Clock className={css({ h: "3.5", w: "3.5" })} />,
    },
    CONFIRMED: {
      label: "Confirmed",
      tone: "gold",
      icon: <PackageCheck className={css({ h: "3.5", w: "3.5" })} />,
    },
    PROCESSING: {
      label: "Being Prepared",
      tone: "gold",
      icon: <Package className={css({ h: "3.5", w: "3.5" })} />,
    },
    SHIPPED: {
      label: "Shipped",
      tone: "gold",
      icon: <Truck className={css({ h: "3.5", w: "3.5" })} />,
    },
    DELIVERED: {
      label: "Delivered",
      tone: "success",
      icon: <CheckCircle2 className={css({ h: "3.5", w: "3.5" })} />,
    },
    CANCELLED: {
      label: "Cancelled",
      tone: "danger",
      icon: <XCircle className={css({ h: "3.5", w: "3.5" })} />,
    },
  };

  const config = statusMap[status] || {
    label: status,
    tone: "neutral" as Tone,
    icon: <AlertCircle className={css({ h: "3.5", w: "3.5" })} />,
  };

  return (
    <span className={statusPillStyle({ tone: config.tone })}>
      {config.icon}
      <span>{config.label}</span>
    </span>
  );
};

// Payment Status Badge Helper
const getPaymentStatusBadge = (status: string) => {
  const statusMap: Record<string, { label: string; tone: Tone }> = {
    COMPLETED: { label: "Paid", tone: "success" },
    PENDING: { label: "Payment Pending", tone: "gold" },
    FAILED: { label: "Payment Failed", tone: "danger" },
    REFUNDED: { label: "Refunded", tone: "neutral" },
  };

  const config = statusMap[status] || { label: status, tone: "neutral" as Tone };

  return <span className={statusPillStyle({ tone: config.tone })}>{config.label}</span>;
};

const summaryRowStyle = css({
  display: "flex",
  justifyContent: "space-between",
  fontSize: "sm",
});

export default function OrdersPage() {
  const { status } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
      return;
    }
    if (status === "authenticated") {
      fetchOrders();
    }
  }, [status, router]);

  const fetchOrders = async () => {
    try {
      const response = await fetch("/api/user/orders");
      if (!response.ok) throw new Error("Failed to fetch orders");
      const data = await response.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.error("Error fetching orders:", error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className={css({ minHeight: "100vh", background: "bg.canvas" })}>
        <TopPromoBanner />
        <HeaderSection />
        <main className={css({ paddingBlock: "8" })}>
          <div className={css({ marginInline: "auto", paddingInline: "4", maxWidth: "5xl" })}>
            <Skeleton className={css({ h: "10", w: "48", marginBottom: "6" })} />
            <div className={css({ display: "flex", flexDirection: "column", gap: "4" })}>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className={css({ h: "64", w: "full" })} />
              ))}
            </div>
          </div>
        </main>
        <FooterSection />
      </div>
    );
  }

  return (
    <div className={css({ minHeight: "100vh", background: "bg.canvas" })}>
      <TopPromoBanner />
      <HeaderSection />
      <main className={css({ paddingBlock: "8" })}>
        <div className={css({ marginInline: "auto", paddingInline: "4", maxWidth: "5xl" })}>
          <div className={css({ marginBottom: "6" })}>
            <BreadcrumbNavigation />
          </div>

          <div
            className={css({
              display: "flex",
              flexDirection: { base: "column", sm: "row" },
              alignItems: { base: "flex-start", sm: "center" },
              justifyContent: "space-between",
              gap: "3",
              marginBottom: "8",
            })}
          >
            <h1
              className={css({
                fontFamily: "display",
                fontSize: { base: "2xl", md: "3xl" },
                fontWeight: "bold",
                color: "fg.default",
              })}
            >
              My Orders
            </h1>
            <Button asChild variant="outline">
              <Link href="/">Continue Shopping</Link>
            </Button>
          </div>

          {orders.length === 0 ? (
            <Card>
              <CardContent
                className={css({
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  paddingBlock: "16",
                })}
              >
                <Package className={css({ h: "16", w: "16", color: "fg.muted", marginBottom: "4" })} />
                <h3
                  className={css({
                    fontSize: "xl",
                    fontWeight: "semibold",
                    color: "fg.default",
                    marginBottom: "2",
                  })}
                >
                  No orders yet
                </h3>
                <p
                  className={css({
                    color: "fg.muted",
                    marginBottom: "6",
                    textAlign: "center",
                    maxWidth: "md",
                  })}
                >
                  Looks like you haven&apos;t placed any orders yet. Start
                  shopping to see your orders here!
                </p>
                <Button asChild>
                  <Link href="/">
                    <ShoppingBag className={css({ h: "4", w: "4" })} />
                    Start Shopping
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className={css({ display: "flex", flexDirection: "column", gap: "6" })}>
              {orders.map((order) => (
                <Card
                  key={order.id}
                  className={css({
                    transition: "box-shadow 0.2s ease",
                    "&:hover": { boxShadow: "glass" },
                  })}
                >
                  <CardHeader className={css({ paddingBottom: "4" })}>
                    <div
                      className={css({
                        display: "flex",
                        flexDirection: { base: "column", sm: "row" },
                        alignItems: { base: "flex-start", sm: "center" },
                        justifyContent: "space-between",
                        gap: "4",
                      })}
                    >
                      <div className={css({ flex: "1" })}>
                        <CardTitle className={css({ display: "flex", alignItems: "center", gap: "2", fontSize: "lg" })}>
                          <div
                            className={css({
                              display: "inline-flex",
                              padding: "2",
                              background: "bg.surface",
                              borderRadius: "md",
                              border: "1px solid",
                              borderColor: "border.subtle",
                            })}
                          >
                            <Package className={css({ h: "5", w: "5", color: "fg.default" })} />
                          </div>
                          <span>Order #{order.orderNumber}</span>
                        </CardTitle>
                        <p
                          className={css({
                            fontSize: "sm",
                            color: "fg.muted",
                            marginTop: "2",
                            marginLeft: "11",
                            display: "flex",
                            alignItems: "center",
                            gap: "1",
                          })}
                        >
                          <Clock className={css({ h: "3.5", w: "3.5" })} />
                          {new Date(order.createdAt).toLocaleDateString(
                            "en-IN",
                            {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </p>
                      </div>
                      <div className={css({ display: "flex", flexWrap: "wrap", gap: "2", alignItems: "center" })}>
                        {getOrderStatusBadge(order.status)}
                        {getPaymentStatusBadge(order.paymentStatus)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className={css({ display: "flex", flexDirection: "column", gap: "6", paddingTop: "6" })}>
                    <div className={css({ display: "flex", flexDirection: "column", gap: "3" })}>
                      {order.items?.map((item) => (
                        <div
                          key={item.id}
                          className={css({
                            display: "flex",
                            alignItems: "center",
                            gap: "4",
                            padding: "4",
                            background: "bg.surface",
                            borderRadius: "md",
                            border: "1px solid",
                            borderColor: "border.subtle",
                          })}
                        >
                          <div
                            className={css({
                              position: "relative",
                              h: "20",
                              w: "20",
                              flexShrink: 0,
                              background: "bg.canvas",
                              borderRadius: "md",
                              border: "1px solid",
                              borderColor: "border.subtle",
                              overflow: "hidden",
                            })}
                          >
                            <Image
                              src={item.image || "/placeholder.jpg"}
                              alt={item.name}
                              fill
                              className={css({ objectFit: "contain", padding: "2" })}
                            />
                          </div>
                          <div className={css({ flex: "1", minWidth: "0" })}>
                            <h4
                              className={css({
                                fontWeight: "semibold",
                                color: "fg.default",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                fontSize: "md",
                              })}
                            >
                              {item.name}
                            </h4>
                            <p className={css({ fontSize: "sm", color: "fg.muted", marginTop: "1" })}>
                              <span className={css({ fontWeight: "medium" })}>Qty:</span> {item.quantity}
                            </p>
                          </div>
                          <div className={css({ textAlign: "right" })}>
                            <p className={css({ fontWeight: "bold", color: "fg.default", fontSize: "lg" })}>
                              ₹
                              {(
                                (item.priceCents * item.quantity) /
                                100
                              ).toLocaleString()}
                            </p>
                            <p className={css({ fontSize: "xs", color: "fg.muted", marginTop: "1" })}>
                              ₹{(item.priceCents / 100).toLocaleString()} each
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div
                      className={css({
                        display: "flex",
                        flexDirection: "column",
                        gap: "3",
                        background: "bg.surface",
                        borderRadius: "md",
                        padding: "4",
                        border: "1px solid",
                        borderColor: "border.subtle",
                      })}
                    >
                      <div className={summaryRowStyle}>
                        <span className={css({ color: "fg.muted", fontWeight: "medium" })}>Subtotal</span>
                        <span className={css({ color: "fg.default", fontWeight: "semibold" })}>
                          ₹{(order.totalCents / 100).toLocaleString()}
                        </span>
                      </div>
                      <div className={summaryRowStyle}>
                        <span className={css({ color: "fg.muted", fontWeight: "medium" })}>Shipping Charges</span>
                        <span className={css({ color: "fg.default", fontWeight: "semibold" })}>
                          {order.shippingCents === 0 ? (
                            <span className={css({ color: "success" })}>FREE</span>
                          ) : (
                            `₹${(order.shippingCents / 100).toLocaleString()}`
                          )}
                        </span>
                      </div>
                      <div
                        className={css({
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "md",
                          fontWeight: "bold",
                          paddingTop: "3",
                          borderTop: "1px solid",
                          borderColor: "border.subtle",
                        })}
                      >
                        <span className={css({ color: "fg.default" })}>Total Amount</span>
                        <span className={css({ color: "fg.default", fontSize: "xl" })}>
                          ₹
                          {(
                            (order.totalCents + order.shippingCents) /
                            100
                          ).toLocaleString()}
                        </span>
                      </div>
                      <div
                        className={css({
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "sm",
                          paddingTop: "2",
                          borderTop: "1px solid",
                          borderColor: "border.subtle",
                        })}
                      >
                        <span className={css({ color: "fg.muted", fontWeight: "medium" })}>Payment Method</span>
                        <span
                          className={css({
                            textTransform: "uppercase",
                            fontWeight: "bold",
                            color: "fg.default",
                            display: "flex",
                            alignItems: "center",
                            gap: "2",
                          })}
                        >
                          {order.paymentMethod === "COD" ||
                          order.paymentMethod === "cod" ? (
                            <>
                              <span
                                className={css({
                                  h: "2",
                                  w: "2",
                                  borderRadius: "full",
                                  background: "accent.default",
                                })}
                              />
                              Cash on Delivery
                            </>
                          ) : (
                            <>
                              <span
                                className={css({
                                  h: "2",
                                  w: "2",
                                  borderRadius: "full",
                                  background: "success",
                                })}
                              />
                              Online Payment
                            </>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className={css({ display: "flex", flexDirection: { base: "column", sm: "row" }, gap: "3", paddingTop: "2" })}>
                      <Button
                        variant="outline"
                        className={css({ flex: "1" })}
                        onClick={() =>
                          toast.info(
                            "Order tracking feature coming soon! We'll notify you when your order ships."
                          )
                        }
                      >
                        <Truck className={css({ h: "4", w: "4" })} />
                        Track Shipment
                      </Button>
                      <Button
                        variant="outline"
                        className={css({ flex: "1" })}
                        onClick={() =>
                          toast.info(
                            "Detailed order view coming soon! Contact support for order details."
                          )
                        }
                      >
                        <Package className={css({ h: "4", w: "4" })} />
                        View Details
                      </Button>
                    </div>
                    <div
                      className={css({
                        background: "gold.50",
                        border: "1px solid",
                        borderColor: "gold.200",
                        borderRadius: "md",
                        padding: "3",
                        textAlign: "center",
                      })}
                    >
                      <p
                        className={css({
                          fontSize: "xs",
                          color: "gold.700",
                          fontWeight: "medium",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "2",
                        })}
                      >
                        <AlertCircle className={css({ h: "3.5", w: "3.5" })} />
                        Real-time order tracking and detailed views coming soon!
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {orders.length > 0 && (
            <Card className={css({ marginTop: "8" })}>
              <CardContent className={css({ paddingBlock: "6" })}>
                <div className={css({ textAlign: "center" })}>
                  <h3 className={css({ fontWeight: "semibold", color: "fg.default", marginBottom: "2" })}>
                    Need Help with Your Order?
                  </h3>
                  <p className={css({ fontSize: "sm", color: "fg.muted", marginBottom: "4" })}>
                    Contact our support team for order updates and assistance
                  </p>
                  <Button asChild variant="outline">
                    <Link href="/profile">Contact Support</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <FooterSection />
    </div>
  );
}
