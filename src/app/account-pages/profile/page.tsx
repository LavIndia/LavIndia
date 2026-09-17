"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { HeaderSection } from "@/components/layout/HeaderSection";
import { FooterSection } from "@/components/layout/FooterSection";
import TopPromoBanner from "@/components/home/TopPromoBanner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Upload,
  User,
  MapPin,
  Package,
  Heart,
  Trash2,
  Plus,
  ShieldCheck,
  Smartphone,
  Monitor,
  Tablet,
} from "lucide-react";
import { toast } from "sonner";
import AddressForm from "@/components/profile/AddressForm";
import AddressCard from "@/components/profile/AddressCard";
import { css, cva } from "styled-system/css";

interface Address {
  id: string;
  fullName: string;
  mobile: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  totalCents: number;
  createdAt: string;
  items: { id: string; quantity: number; price: number }[];
  address: Address;
}

interface WishlistItem {
  id: string;
  product: {
    id: string;
    name: string;
    priceCents: number;
    images: Array<{ url: string; alt: string }>;
    category: { name: string };
  };
}

interface LoginEvent {
  id: string;
  ipAddress: string | null;
  browser: string | null;
  os: string | null;
  deviceType: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  createdAt: string;
}

const statusToneStyle = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: "full",
    border: "1px solid",
    paddingInline: "3",
    paddingBlock: "1",
    fontSize: "xs",
    fontWeight: "medium",
    fontFamily: "body",
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

const statusTone = (status: string): "neutral" | "gold" | "success" | "danger" => {
  switch (status.toLowerCase()) {
    case "delivered":
      return "success";
    case "cancelled":
      return "danger";
    case "shipped":
    case "processing":
    case "confirmed":
      return "gold";
    default:
      return "neutral";
  }
};

const emptyStateStyle = css({
  paddingBlock: "12",
  textAlign: "center",
});

const sectionHeadingStyle = css({
  fontFamily: "display",
  fontSize: { base: "xl", md: "2xl" },
  fontWeight: "semibold",
  color: "fg.default",
});

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [loginEvents, setLoginEvents] = useState<LoginEvent[]>([]);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);

  const loadProfileData = useCallback(async () => {
    setLoading(true);
    try {
      // Load profile picture from session/database
      if (session?.user?.image) {
        setProfilePicture(session.user.image);
      }

      // Load addresses
      const addressRes = await fetch("/api/user/address");
      if (addressRes.ok) {
        const { addresses: fetchedAddresses } = await addressRes.json();
        setAddresses(fetchedAddresses);
      }

      // Load orders
      const ordersRes = await fetch("/api/user/orders");
      if (ordersRes.ok) {
        const { orders: fetchedOrders } = await ordersRes.json();
        setOrders(fetchedOrders);
      }

      // Load wishlist
      const wishlistRes = await fetch("/api/user/wishlist");
      if (wishlistRes.ok) {
        const { wishlist: fetchedWishlist } = await wishlistRes.json();
        setWishlist(fetchedWishlist);
      }

      // Load login history
      const loginEventsRes = await fetch("/api/user/login-events");
      if (loginEventsRes.ok) {
        const { events } = await loginEventsRes.json();
        setLoginEvents(events);
      }
    } catch (error) {
      console.error("Failed to load profile data:", error);
      toast.error("Failed to load profile data");
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
      return;
    }

    if (status === "authenticated" && session?.user) {
      loadProfileData();
    }
  }, [status, session, router, loadProfileData]);

  const handleProfilePictureUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("File must be an image");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/user/profile-picture", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const { profilePicture: newPicture } = await response.json();
      setProfilePicture(newPicture);
      toast.success("Profile picture updated!");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload profile picture");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteProfilePicture = async () => {
    try {
      const response = await fetch("/api/user/profile-picture", {
        method: "DELETE",
      });

      if (response.ok) {
        setProfilePicture(null);
        toast.success("Profile picture removed");
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to remove profile picture");
    }
  };

  const handleAddAddress = () => {
    setEditingAddress(null);
    setShowAddressForm(true);
  };

  const handleEditAddress = (address: Address) => {
    setEditingAddress(address);
    setShowAddressForm(true);
  };

  const handleDeleteAddress = async (id: string) => {
    try {
      const response = await fetch(`/api/user/address?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setAddresses((prev) => prev.filter((addr) => addr.id !== id));
        toast.success("Address deleted");
      } else {
        throw new Error("Delete failed");
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete address");
    }
  };

  const handleSaveAddress = async () => {
    setShowAddressForm(false);
    setEditingAddress(null);
    await loadProfileData(); // Reload addresses
  };

  const handleRemoveFromWishlist = async (productId: string) => {
    try {
      const response = await fetch(
        `/api/user/wishlist?productId=${productId}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        setWishlist((prev) =>
          prev.filter((item) => item.product.id !== productId)
        );
        toast.success("Removed from wishlist");
      }
    } catch (error) {
      console.error("Remove error:", error);
      toast.error("Failed to remove from wishlist");
    }
  };

  if (status === "loading" || loading) {
    return (
      <div
        className={css({
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
        })}
      >
        <Loader2 className={css({ h: "8", w: "8", animation: "spin", color: "accent.default" })} />
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  return (
    <div className={css({ minHeight: "100vh", background: "bg.canvas" })}>
      <TopPromoBanner />
      <HeaderSection />

      <div
        className={css({
          marginInline: "auto",
          paddingInline: "4",
          paddingBlock: "8",
          maxWidth: "7xl",
        })}
      >
        <h1
          className={css({
            fontFamily: "display",
            fontSize: { base: "2xl", md: "3xl" },
            fontWeight: "bold",
            color: "fg.default",
            marginBottom: "8",
          })}
        >
          My Profile
        </h1>

        <Tabs defaultValue="profile" className={css({ gap: "6" })}>
          <TabsList
            className={css({
              display: "grid",
              width: "full",
              gridTemplateColumns: "repeat(2, 1fr)",
              md: { gridTemplateColumns: "repeat(5, 1fr)", maxWidth: "3xl" },
              height: "auto",
            })}
          >
            <TabsTrigger value="profile" className={css({ gap: "2" })}>
              <User className={css({ h: "4", w: "4" })} />
              Profile
            </TabsTrigger>
            <TabsTrigger value="addresses" className={css({ gap: "2" })}>
              <MapPin className={css({ h: "4", w: "4" })} />
              Addresses
            </TabsTrigger>
            <TabsTrigger value="orders" className={css({ gap: "2" })}>
              <Package className={css({ h: "4", w: "4" })} />
              Orders
            </TabsTrigger>
            <TabsTrigger value="wishlist" className={css({ gap: "2" })}>
              <Heart className={css({ h: "4", w: "4" })} />
              Wishlist
            </TabsTrigger>
            <TabsTrigger value="security" className={css({ gap: "2" })}>
              <ShieldCheck className={css({ h: "4", w: "4" })} />
              Security
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card variant="glass">
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Manage your account details and profile picture
                </CardDescription>
              </CardHeader>
              <CardContent className={css({ display: "flex", flexDirection: "column", gap: "6" })}>
                {/* Profile Picture */}
                <div
                  className={css({
                    display: "flex",
                    flexDirection: { base: "column", sm: "row" },
                    alignItems: { base: "flex-start", sm: "center" },
                    gap: "6",
                  })}
                >
                  <Avatar className={css({ h: "24", w: "24" })}>
                    <AvatarImage
                      src={profilePicture || undefined}
                      alt={session.user.name || "User"}
                    />
                    <AvatarFallback
                      className={css({
                        fontSize: "2xl",
                        background: "linear-gradient(135deg, {colors.gold.300}, {colors.gold.500})",
                        color: "fg.onGold",
                      })}
                    >
                      {session.user.name?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className={css({ display: "flex", flexDirection: "column", gap: "2" })}>
                    <label htmlFor="profile-picture-upload">
                      <Button asChild variant="outline" disabled={uploading}>
                        <span className={css({ cursor: "pointer" })}>
                          {uploading ? (
                            <>
                              <Loader2 className={css({ h: "4", w: "4", animation: "spin" })} />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className={css({ h: "4", w: "4" })} />
                              Upload Photo
                            </>
                          )}
                        </span>
                      </Button>
                    </label>
                    <input
                      id="profile-picture-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleProfilePictureUpload}
                      className={css({ srOnly: true })}
                    />
                    {profilePicture && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDeleteProfilePicture}
                      >
                        <Trash2 className={css({ h: "4", w: "4" })} />
                        Remove
                      </Button>
                    )}
                    <p className={css({ fontSize: "sm", color: "fg.muted" })}>
                      Max file size: 5MB
                    </p>
                  </div>
                </div>

                {/* User Info */}
                <div className={css({ display: "flex", flexDirection: "column", gap: "4" })}>
                  <div className={css({ display: "flex", flexDirection: "column", gap: "1.5" })}>
                    <Label>Name</Label>
                    <Input value={session.user.name || ""} disabled />
                  </div>
                  <div className={css({ display: "flex", flexDirection: "column", gap: "1.5" })}>
                    <Label>Username</Label>
                    <Input value={session.user.username || ""} disabled />
                  </div>
                  <div className={css({ display: "flex", flexDirection: "column", gap: "1.5" })}>
                    <Label>Email</Label>
                    <Input value={session.user.email || ""} disabled />
                  </div>
                  {session.user.mobile && (
                    <div className={css({ display: "flex", flexDirection: "column", gap: "1.5" })}>
                      <Label>Mobile</Label>
                      <Input value={session.user.mobile} disabled />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Addresses Tab */}
          <TabsContent value="addresses" className={css({ display: "flex", flexDirection: "column", gap: "4" })}>
            <div
              className={css({
                display: "flex",
                flexDirection: { base: "column", sm: "row" },
                alignItems: { base: "flex-start", sm: "center" },
                justifyContent: "space-between",
                gap: "3",
              })}
            >
              <h2 className={sectionHeadingStyle}>Saved Addresses</h2>
              <Button onClick={handleAddAddress}>
                <Plus className={css({ h: "4", w: "4" })} />
                Add Address
              </Button>
            </div>

            {showAddressForm && (
              <AddressForm
                address={editingAddress}
                onSave={handleSaveAddress}
                onCancel={() => {
                  setShowAddressForm(false);
                  setEditingAddress(null);
                }}
              />
            )}

            {addresses.length === 0 ? (
              <Card>
                <CardContent className={emptyStateStyle}>
                  <MapPin
                    className={css({
                      marginInline: "auto",
                      h: "12",
                      w: "12",
                      color: "fg.muted",
                    })}
                  />
                  <h3
                    className={css({
                      marginTop: "4",
                      fontSize: "lg",
                      fontWeight: "medium",
                      color: "fg.default",
                    })}
                  >
                    No addresses saved
                  </h3>
                  <p className={css({ marginTop: "2", fontSize: "sm", color: "fg.muted" })}>
                    Add a shipping address to get started
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div
                className={css({
                  display: "grid",
                  gap: "4",
                  gridTemplateColumns: "1fr",
                  md: { gridTemplateColumns: "1fr 1fr" },
                })}
              >
                {addresses.map((address) => (
                  <AddressCard
                    key={address.id}
                    address={address}
                    onEdit={handleEditAddress}
                    onDelete={handleDeleteAddress}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className={css({ display: "flex", flexDirection: "column", gap: "4" })}>
            <h2 className={sectionHeadingStyle}>Order History</h2>

            {orders.length === 0 ? (
              <Card>
                <CardContent className={emptyStateStyle}>
                  <Package
                    className={css({
                      marginInline: "auto",
                      h: "12",
                      w: "12",
                      color: "fg.muted",
                    })}
                  />
                  <h3
                    className={css({
                      marginTop: "4",
                      fontSize: "lg",
                      fontWeight: "medium",
                      color: "fg.default",
                    })}
                  >
                    No orders yet
                  </h3>
                  <p className={css({ marginTop: "2", fontSize: "sm", color: "fg.muted" })}>
                    Your order history will appear here
                  </p>
                  <Button className={css({ marginTop: "4" })} onClick={() => router.push("/")}>
                    Start Shopping
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className={css({ display: "flex", flexDirection: "column", gap: "4" })}>
                {orders.map((order) => (
                  <Card key={order.id}>
                    <CardHeader>
                      <div
                        className={css({
                          display: "flex",
                          flexDirection: { base: "column", sm: "row" },
                          justifyContent: "space-between",
                          alignItems: { base: "flex-start", sm: "flex-start" },
                          gap: "3",
                        })}
                      >
                        <div>
                          <CardTitle>Order #{order.orderNumber}</CardTitle>
                          <CardDescription>
                            Placed on{" "}
                            {new Date(order.createdAt).toLocaleDateString("en-IN")}
                          </CardDescription>
                        </div>
                        <span className={statusToneStyle({ tone: statusTone(order.status) })}>
                          {order.status}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className={css({ display: "flex", flexDirection: "column", gap: "2" })}>
                        <p className={css({ fontSize: "sm", color: "fg.default" })}>
                          <strong>Items:</strong> {order.items.length}
                        </p>
                        <p className={css({ fontSize: "sm", color: "fg.default" })}>
                          <strong>Total:</strong> ₹
                          {((order.totalCents || 0) / 100).toLocaleString()}
                        </p>
                        <p className={css({ fontSize: "sm", color: "fg.default" })}>
                          <strong>Shipping to:</strong> {order.address.fullName}
                          , {order.address.city}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Wishlist Tab */}
          <TabsContent value="wishlist" className={css({ display: "flex", flexDirection: "column", gap: "4" })}>
            <h2 className={sectionHeadingStyle}>My Wishlist</h2>

            {wishlist.length === 0 ? (
              <Card>
                <CardContent className={emptyStateStyle}>
                  <Heart
                    className={css({
                      marginInline: "auto",
                      h: "12",
                      w: "12",
                      color: "fg.muted",
                    })}
                  />
                  <h3
                    className={css({
                      marginTop: "4",
                      fontSize: "lg",
                      fontWeight: "medium",
                      color: "fg.default",
                    })}
                  >
                    Your wishlist is empty
                  </h3>
                  <p className={css({ marginTop: "2", fontSize: "sm", color: "fg.muted" })}>
                    Add items you love to your wishlist
                  </p>
                  <Button className={css({ marginTop: "4" })} onClick={() => router.push("/")}>
                    Browse Products
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div
                className={css({
                  display: "grid",
                  gap: "6",
                  gridTemplateColumns: "1fr",
                  sm: { gridTemplateColumns: "repeat(2, 1fr)" },
                  lg: { gridTemplateColumns: "repeat(3, 1fr)" },
                  xl: { gridTemplateColumns: "repeat(4, 1fr)" },
                })}
              >
                {wishlist.map((item) => (
                  <Card key={item.id} className={css({ overflow: "hidden" })}>
                    <div className={css({ position: "relative", aspectRatio: "1 / 1" })}>
                      <Image
                        src={item.product.images[0]?.url || "/placeholder.png"}
                        alt={item.product.images[0]?.alt || item.product.name}
                        fill
                        className={css({ objectFit: "cover" })}
                      />
                    </div>
                    <CardContent className={css({ padding: "4" })}>
                      <Badge variant="outline" className={css({ marginBottom: "2" })}>
                        {item.product.category.name}
                      </Badge>
                      <h3
                        className={css({
                          fontWeight: "medium",
                          marginBottom: "2",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          color: "fg.default",
                        })}
                      >
                        {item.product.name}
                      </h3>
                      <p
                        className={css({
                          fontFamily: "display",
                          fontSize: "lg",
                          fontWeight: "bold",
                          marginBottom: "3",
                          color: "fg.default",
                        })}
                      >
                        ₹
                        {(
                          (item.product.priceCents || 0) / 100
                        ).toLocaleString()}
                      </p>
                      <div className={css({ display: "flex", gap: "2" })}>
                        <Button
                          variant="outline"
                          size="sm"
                          className={css({ flex: "1" })}
                          onClick={() =>
                            router.push(`/product/${item.product.id}`)
                          }
                        >
                          View
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleRemoveFromWishlist(item.product.id)
                          }
                        >
                          <Trash2 className={css({ h: "4", w: "4", color: "danger" })} />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className={css({ display: "flex", flexDirection: "column", gap: "4" })}>
            <div>
              <h2 className={sectionHeadingStyle}>Recent Sign-ins</h2>
              <p className={css({ fontSize: "sm", color: "fg.muted", marginTop: "1" })}>
                For your security, we keep a record of recent sign-ins to your
                account, including approximate location and device — never
                precise GPS location.
              </p>
            </div>

            {loginEvents.length === 0 ? (
              <Card>
                <CardContent className={emptyStateStyle}>
                  <ShieldCheck
                    className={css({ marginInline: "auto", h: "12", w: "12", color: "fg.muted" })}
                  />
                  <h3 className={css({ marginTop: "4", fontSize: "lg", fontWeight: "medium", color: "fg.default" })}>
                    No sign-in history yet
                  </h3>
                </CardContent>
              </Card>
            ) : (
              <div className={css({ display: "flex", flexDirection: "column", gap: "3" })}>
                {loginEvents.map((event, index) => {
                  const DeviceIcon =
                    event.deviceType === "Mobile"
                      ? Smartphone
                      : event.deviceType === "Tablet"
                      ? Tablet
                      : Monitor;
                  const location = [event.city, event.region, event.country]
                    .filter(Boolean)
                    .join(", ");
                  return (
                    <Card key={event.id}>
                      <CardContent
                        className={css({
                          display: "flex",
                          alignItems: "center",
                          gap: "4",
                          paddingBlock: "4",
                        })}
                      >
                        <DeviceIcon
                          className={css({ h: "6", w: "6", color: "accent.default", flexShrink: "0" })}
                        />
                        <div className={css({ flex: "1", minWidth: "0" })}>
                          <p className={css({ fontSize: "sm", fontWeight: "medium", color: "fg.default" })}>
                            {[event.browser, event.os].filter(Boolean).join(" on ") ||
                              "Unknown device"}
                            {index === 0 && (
                              <span
                                className={statusToneStyle({ tone: "success" })}
                                style={{ marginLeft: "8px" }}
                              >
                                Current
                              </span>
                            )}
                          </p>
                          <p className={css({ fontSize: "xs", color: "fg.muted", marginTop: "0.5" })}>
                            {location || "Location unavailable"}
                            {event.ipAddress ? ` · ${event.ipAddress}` : ""}
                          </p>
                        </div>
                        <p className={css({ fontSize: "xs", color: "fg.muted", whiteSpace: "nowrap" })}>
                          {new Date(event.createdAt).toLocaleString("en-IN")}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <FooterSection />
    </div>
  );
}
