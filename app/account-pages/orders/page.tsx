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
import { Badge } from "@/components/ui/badge";
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

// Order Status Badge Helper
const getOrderStatusBadge = (status: string) => {
  const statusMap: Record<
    string,
    { label: string; className: string; icon: React.ReactElement }
  > = {
    PENDING: {
      label: "Pending",
      className: "bg-amber-100 text-amber-800 border-amber-200",
      icon: <Clock className="h-3.5 w-3.5" />,
    },
    CONFIRMED: {
      label: "Confirmed",
      className: "bg-blue-100 text-blue-800 border-blue-200",
      icon: <PackageCheck className="h-3.5 w-3.5" />,
    },
    PROCESSING: {
      label: "Being Prepared",
      className: "bg-purple-100 text-purple-800 border-purple-200",
      icon: <Package className="h-3.5 w-3.5" />,
    },
    SHIPPED: {
      label: "Shipped",
      className: "bg-indigo-100 text-indigo-800 border-indigo-200",
      icon: <Truck className="h-3.5 w-3.5" />,
    },
    DELIVERED: {
      label: "Delivered",
      className: "bg-green-100 text-green-800 border-green-200",
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    },
    CANCELLED: {
      label: "Cancelled",
      className: "bg-red-100 text-red-800 border-red-200",
      icon: <XCircle className="h-3.5 w-3.5" />,
    },
  };

  const config = statusMap[status] || {
    label: status,
    className: "bg-gray-100 text-gray-800 border-gray-200",
    icon: <AlertCircle className="h-3.5 w-3.5" />,
  };

  return (
    <Badge
      className={`${config.className} border font-medium px-3 py-1 gap-1.5`}
      variant="outline"
    >
      {config.icon}
      <span>{config.label}</span>
    </Badge>
  );
};

// Payment Status Badge Helper
const getPaymentStatusBadge = (status: string) => {
  const statusMap: Record<string, { label: string; className: string }> = {
    COMPLETED: {
      label: "Paid",
      className: "bg-emerald-100 text-emerald-800 border-emerald-200",
    },
    PENDING: {
      label: "Payment Pending",
      className: "bg-yellow-100 text-yellow-800 border-yellow-200",
    },
    FAILED: {
      label: "Payment Failed",
      className: "bg-red-100 text-red-800 border-red-200",
    },
    REFUNDED: {
      label: "Refunded",
      className: "bg-orange-100 text-orange-800 border-orange-200",
    },
  };

  const config = statusMap[status] || {
    label: status,
    className: "bg-gray-100 text-gray-800 border-gray-200",
  };

  return (
    <Badge
      className={`${config.className} border font-medium px-3 py-1`}
      variant="outline"
    >
      {config.label}
    </Badge>
  );
};

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
      <div className="min-h-screen bg-white">
        <TopPromoBanner />
        <HeaderSection />
        <main className="py-8">
          <div className="container mx-auto px-4 max-w-5xl">
            <Skeleton className="h-10 w-48 mb-6" />
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-64 w-full" />
              ))}
            </div>
          </div>
        </main>
        <FooterSection />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <TopPromoBanner />
      <HeaderSection />
      <main className="py-8">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="mb-6">
            <BreadcrumbNavigation />
          </div>

          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
            <Button asChild variant="outline">
              <Link href="/">Continue Shopping</Link>
            </Button>
          </div>

          {orders.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Package className="h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No orders yet
                </h3>
                <p className="text-gray-600 mb-6 text-center max-w-md">
                  Looks like you haven&apos;t placed any orders yet. Start
                  shopping to see your orders here!
                </p>
                <Button asChild>
                  <Link href="/">
                    <ShoppingBag className="mr-2 h-4 w-4" />
                    Start Shopping
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {orders.map((order) => (
                <Card
                  key={order.id}
                  className="hover:shadow-xl transition-all duration-200 border-gray-200"
                >
                  <CardHeader className="bg-gradient-to-r from-gray-50 to-white pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center gap-2 text-gray-900">
                          <div className="p-2 bg-white rounded-lg shadow-sm border border-gray-200">
                            <Package className="h-5 w-5 text-gray-700" />
                          </div>
                          <span>Order #{order.orderNumber}</span>
                        </CardTitle>
                        <p className="text-sm text-gray-500 mt-2 ml-11">
                          <Clock className="h-3.5 w-3.5 inline mr-1" />
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
                      <div className="flex flex-wrap gap-2 items-center">
                        {getOrderStatusBadge(order.status)}
                        {getPaymentStatusBadge(order.paymentStatus)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6 pt-6">
                    <div className="space-y-3">
                      {order.items?.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-100 hover:shadow-sm transition-shadow"
                        >
                          <div className="relative h-20 w-20 flex-shrink-0 bg-white rounded-lg border-2 border-gray-200 overflow-hidden">
                            <Image
                              src={item.image || "/placeholder.jpg"}
                              alt={item.name}
                              fill
                              className="object-contain p-2"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 truncate text-base">
                              {item.name}
                            </h4>
                            <p className="text-sm text-gray-500 mt-1">
                              <span className="font-medium">Qty:</span>{" "}
                              {item.quantity}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-gray-900 text-lg">
                              ₹
                              {(
                                (item.priceCents * item.quantity) /
                                100
                              ).toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              ₹{(item.priceCents / 100).toLocaleString()} each
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="border-t-2 border-gray-200 pt-4 space-y-3 bg-gray-50 -mx-6 px-6 py-4 rounded-lg">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 font-medium">
                          Subtotal
                        </span>
                        <span className="text-gray-900 font-semibold">
                          ₹{(order.totalCents / 100).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 font-medium">
                          Shipping Charges
                        </span>
                        <span className="text-gray-900 font-semibold">
                          {order.shippingCents === 0 ? (
                            <span className="text-green-600">FREE</span>
                          ) : (
                            `₹${(order.shippingCents / 100).toLocaleString()}`
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between text-base font-bold pt-3 border-t border-gray-300">
                        <span className="text-gray-900">Total Amount</span>
                        <span className="text-gray-900 text-xl">
                          ₹
                          {(
                            (order.totalCents + order.shippingCents) /
                            100
                          ).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                        <span className="text-gray-600 font-medium">
                          Payment Method
                        </span>
                        <span className="uppercase font-bold text-gray-900 flex items-center gap-2">
                          {order.paymentMethod === "COD" ||
                          order.paymentMethod === "cod" ? (
                            <>
                              <span className="h-2 w-2 bg-blue-500 rounded-full"></span>
                              Cash on Delivery
                            </>
                          ) : (
                            <>
                              <span className="h-2 w-2 bg-purple-500 rounded-full"></span>
                              Online Payment
                            </>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Button
                        variant="outline"
                        className="flex-1 border-gray-300 hover:bg-gray-50"
                        onClick={() =>
                          toast.info(
                            "Order tracking feature coming soon! We'll notify you when your order ships."
                          )
                        }
                      >
                        <Truck className="mr-2 h-4 w-4" />
                        Track Shipment
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 border-gray-300 hover:bg-gray-50"
                        onClick={() =>
                          toast.info(
                            "Detailed order view coming soon! Contact support for order details."
                          )
                        }
                      >
                        <Package className="mr-2 h-4 w-4" />
                        View Details
                      </Button>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
                      <p className="text-xs text-amber-700 font-medium flex items-center justify-center gap-2">
                        <AlertCircle className="h-3.5 w-3.5" />
                        Real-time order tracking and detailed views coming soon!
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {orders.length > 0 && (
            <Card className="mt-8">
              <CardContent className="py-6">
                <div className="text-center">
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Need Help with Your Order?
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
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
