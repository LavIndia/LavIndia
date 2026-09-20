"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import type {
  Address,
  LoginEvent,
  Order,
  WishlistItem,
} from "@/components/profile/profile-types";

/**
 * Loads everything the account screens show, and owns the mutations that
 * change it.
 *
 * Kept out of the page so that the page is only composition — which tab is
 * open and what goes in it — and so the fetching can be tested or replaced
 * without touching any markup.
 */
export function useProfileData() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [loginEvents, setLoginEvents] = useState<LoginEvent[]>([]);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      if (session?.user?.image) setProfilePicture(session.user.image);

      // One pass over the four account endpoints rather than four sequential
      // waits, since none of them depends on another.
      const [addressRes, ordersRes, wishlistRes, loginEventsRes] = await Promise.all([
        fetch("/api/user/address"),
        fetch("/api/user/orders"),
        fetch("/api/user/wishlist"),
        fetch("/api/user/login-events"),
      ]);

      if (addressRes.ok) setAddresses((await addressRes.json()).addresses);
      if (ordersRes.ok) setOrders((await ordersRes.json()).orders);
      if (wishlistRes.ok) setWishlist((await wishlistRes.json()).wishlist);
      if (loginEventsRes.ok) setLoginEvents((await loginEventsRes.json()).events);
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
      reload();
    }
  }, [status, session, router, reload]);

  const deleteAddress = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/user/address?id=${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Delete failed");
      setAddresses((current) => current.filter((address) => address.id !== id));
      toast.success("Address deleted");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete address");
    }
  }, []);

  const removeFromWishlist = useCallback(async (productId: string) => {
    try {
      const response = await fetch(`/api/user/wishlist?productId=${productId}`, {
        method: "DELETE",
      });
      if (!response.ok) return;
      setWishlist((current) =>
        current.filter((item) => item.product.id !== productId),
      );
      toast.success("Removed from wishlist");
    } catch (error) {
      console.error("Remove error:", error);
      toast.error("Failed to remove from wishlist");
    }
  }, []);

  return {
    session,
    status,
    loading,
    profilePicture,
    setProfilePicture,
    addresses,
    orders,
    wishlist,
    loginEvents,
    reload,
    deleteAddress,
    removeFromWishlist,
  };
}
