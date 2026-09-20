"use client";

import { Suspense } from "react";
import { useRouter } from "next/navigation";
import { Heart, MapPin, Package, ShieldCheck, User } from "lucide-react";
import { HeaderSection } from "@/components/layout/HeaderSection";
import { FooterSection } from "@/components/layout/FooterSection";
import TopPromoBanner from "@/components/home/TopPromoBanner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProfileTab } from "@/components/profile/use-profile-tab";
import { useProfileData } from "@/components/profile/use-profile-data";
import { ProfileFallback } from "@/components/profile/ProfileFallback";
import { ProfileDetailsTab } from "@/components/profile/ProfileDetailsTab";
import { AddressesTab } from "@/components/profile/AddressesTab";
import { OrdersTab } from "@/components/profile/OrdersTab";
import { WishlistTab } from "@/components/profile/WishlistTab";
import { SecurityTab } from "@/components/profile/SecurityTab";
import { tabIconStyle, tabPanelStyle } from "@/components/profile/profile.styles";
import { css } from "styled-system/css";

/**
 * The customer's account screen.
 *
 * Composition only: which tab is open, and which component fills it. The
 * loading lives in useProfileData and each tab owns its own markup, so this
 * file stays readable as tabs are added or changed.
 */

const pageStyle = css({ minHeight: "100vh", background: "bg.canvas" });

const containerStyle = css({
  marginInline: "auto",
  paddingInline: "4",
  paddingBlock: "8",
  maxWidth: "7xl",
});

const titleStyle = css({
  fontFamily: "display",
  fontSize: { base: "2xl", md: "3xl" },
  fontWeight: "bold",
  color: "fg.default",
  marginBottom: "8",
});

const tabListStyle = css({
  display: "grid",
  width: "full",
  gridTemplateColumns: "repeat(2, 1fr)",
  md: { gridTemplateColumns: "repeat(5, 1fr)", maxWidth: "3xl" },
  height: "auto",
});

const TABS = [
  { value: "profile", label: "Profile", icon: User },
  { value: "addresses", label: "Addresses", icon: MapPin },
  { value: "orders", label: "Orders", icon: Package },
  { value: "wishlist", label: "Wishlist", icon: Heart },
  { value: "security", label: "Security", icon: ShieldCheck },
] as const;

function ProfileContent() {
  // Lets /profile?tab=wishlist and /profile?tab=addresses open on the right
  // tab, which is what the account menu and the /wishlist and /addresses
  // URLs link to.
  const { tab, selectTab } = useProfileTab();
  const router = useRouter();
  const {
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
  } = useProfileData();

  if (status === "loading" || loading) return <ProfileFallback />;
  if (!session?.user) return null;

  return (
    <div className={pageStyle}>
      <TopPromoBanner />
      <HeaderSection />

      <div className={containerStyle}>
        <h1 className={titleStyle}>My Profile</h1>

        <Tabs value={tab} onValueChange={selectTab} className={css({ gap: "6" })}>
          <TabsList className={tabListStyle}>
            {TABS.map(({ value, label, icon: Icon }) => (
              <TabsTrigger key={value} value={value} className={css({ gap: "2" })}>
                <Icon className={tabIconStyle} />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="profile">
            <ProfileDetailsTab
              user={session.user}
              profilePicture={profilePicture}
              onPictureChange={setProfilePicture}
            />
          </TabsContent>

          <TabsContent value="addresses" className={tabPanelStyle}>
            <AddressesTab
              addresses={addresses}
              onDelete={deleteAddress}
              onSaved={reload}
            />
          </TabsContent>

          <TabsContent value="orders" className={tabPanelStyle}>
            <OrdersTab orders={orders} onStartShopping={() => router.push("/shop")} />
          </TabsContent>

          <TabsContent value="wishlist" className={tabPanelStyle}>
            <WishlistTab
              wishlist={wishlist}
              onBrowse={() => router.push("/shop")}
              onView={(productId) => router.push(`/product/${productId}`)}
              onRemove={removeFromWishlist}
            />
          </TabsContent>

          <TabsContent value="security" className={tabPanelStyle}>
            <SecurityTab loginEvents={loginEvents} />
          </TabsContent>
        </Tabs>
      </div>

      <FooterSection />
    </div>
  );
}

// useSearchParams (via useProfileTab) must sit under a Suspense boundary —
// the same pattern the order-success, order-failed and budget pages use.
export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfileFallback />}>
      <ProfileContent />
    </Suspense>
  );
}
