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
} from "lucide-react";
import { toast } from "sonner";
import AddressForm from "@/components/profile/AddressForm";
import AddressCard from "@/components/profile/AddressCard";

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

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
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
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "delivered":
        return "bg-green-100 text-green-800";
      case "shipped":
        return "bg-blue-100 text-blue-800";
      case "processing":
        return "bg-yellow-100 text-yellow-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <TopPromoBanner />
      <HeaderSection />

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <h1 className="text-3xl font-bold mb-8">My Profile</h1>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 max-w-2xl">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="addresses" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Addresses
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Orders
            </TabsTrigger>
            <TabsTrigger value="wishlist" className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Wishlist
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Manage your account details and profile picture
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Profile Picture */}
                <div className="flex items-center gap-6">
                  <Avatar className="h-24 w-24">
                    <AvatarImage
                      src={profilePicture || undefined}
                      alt={session.user.name || "User"}
                    />
                    <AvatarFallback className="text-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white">
                      {session.user.name?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                    <label htmlFor="profile-picture-upload">
                      <Button asChild variant="outline" disabled={uploading}>
                        <span className="cursor-pointer">
                          {uploading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="mr-2 h-4 w-4" />
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
                      className="hidden"
                    />
                    {profilePicture && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDeleteProfilePicture}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove
                      </Button>
                    )}
                    <p className="text-sm text-gray-500">Max file size: 5MB</p>
                  </div>
                </div>

                {/* User Info */}
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Name</label>
                    <Input
                      value={session.user.name || ""}
                      disabled
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <Input
                      value={session.user.email || ""}
                      disabled
                      className="mt-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Addresses Tab */}
          <TabsContent value="addresses" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">Saved Addresses</h2>
              <Button onClick={handleAddAddress}>
                <Plus className="mr-2 h-4 w-4" />
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
                <CardContent className="py-12 text-center">
                  <MapPin className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium">
                    No addresses saved
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Add a shipping address to get started
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
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
          <TabsContent value="orders" className="space-y-4">
            <h2 className="text-2xl font-semibold">Order History</h2>

            {orders.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium">No orders yet</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Your order history will appear here
                  </p>
                  <Button className="mt-4" onClick={() => router.push("/")}>
                    Start Shopping
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <Card key={order.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle>Order #{order.orderNumber}</CardTitle>
                          <CardDescription>
                            Placed on{" "}
                            {new Date(order.createdAt).toLocaleDateString()}
                          </CardDescription>
                        </div>
                        <Badge className={getStatusColor(order.status)}>
                          {order.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p className="text-sm">
                          <strong>Items:</strong> {order.items.length}
                        </p>
                        <p className="text-sm">
                          <strong>Total:</strong> ₹
                          {((order.totalCents || 0) / 100).toLocaleString()}
                        </p>
                        <p className="text-sm">
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
          <TabsContent value="wishlist" className="space-y-4">
            <h2 className="text-2xl font-semibold">My Wishlist</h2>

            {wishlist.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Heart className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium">
                    Your wishlist is empty
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Add items you love to your wishlist
                  </p>
                  <Button className="mt-4" onClick={() => router.push("/")}>
                    Browse Products
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {wishlist.map((item) => (
                  <Card key={item.id} className="overflow-hidden">
                    <div className="aspect-square relative">
                      <Image
                        src={item.product.images[0]?.url || "/placeholder.png"}
                        alt={item.product.images[0]?.alt || item.product.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <CardContent className="p-4">
                      <Badge variant="outline" className="mb-2">
                        {item.product.category.name}
                      </Badge>
                      <h3 className="font-medium mb-2 line-clamp-1">
                        {item.product.name}
                      </h3>
                      <p className="text-lg font-bold mb-3">
                        ₹
                        {(
                          (item.product.priceCents || 0) / 100
                        ).toLocaleString()}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
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
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <FooterSection />
    </div>
  );
}
