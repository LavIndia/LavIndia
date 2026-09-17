"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Heart } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import AddToCartButton from "@/components/cart/AddToCartButton";
import { ShareButton } from "@/components/ShareButton";
import { css, cx } from "styled-system/css";

interface ProductCardProps {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  price: number;
  compareAtPrice?: number | null;
  images: Array<{ url: string; alt: string }>;
  isFeatured?: boolean;
  isNewArrival?: boolean;
  isBestSeller?: boolean;
  isLimitedEdition?: boolean;
  isWishlisted?: boolean;
  stock?: number;
  variants?: Array<{
    id: string;
    name: string;
    price: number;
    color: string | null;
    size: string | null;
    material: string | null;
    stock: number;
  }>;
}

// Restrained, editorial treatment (per 2026 luxury e-commerce research: quiet
// whitespace-led grids, no decorative framing, large imagery, minimal text)
// — the card itself carries no border/background; separation between cards
// comes from grid gutter spacing (set by the parent grid), not a box.
const cardStyle = css({ background: "transparent" });

const imageBoxStyle = css({
  display: "block",
  position: "relative",
  width: "full",
  aspectRatio: "1 / 1",
  overflow: "hidden",
  borderRadius: "lg",
  background: "bg.surface",
  boxShadow: "0 1px 2px rgba(31,29,27,0.06)",
  transition: "box-shadow 0.35s ease",
  "&:hover": { boxShadow: "card" },
  "&:hover img": { transform: "scale(1.045)" },
});

const imageStyle = css({
  objectFit: "cover",
  transition: "transform 0.6s cubic-bezier(0.22,1,0.36,1)",
});

const wishlistButtonStyle = cx(
  css({
    position: "absolute",
    top: "3",
    right: "3",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "full",
    padding: "2",
    cursor: "pointer",
    background: "bg.glassStrong",
    backdropBlur: "glassSm",
    color: "fg.muted",
    transition: "all 0.2s ease",
    "&:hover": { background: "danger", color: "white" },
    "&:disabled": { opacity: 0.5, cursor: "not-allowed" },
  })
);

const shareButtonStyle = css({
  position: "absolute",
  top: "14",
  right: "3",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "full",
  padding: "2",
  cursor: "pointer",
  background: "bg.glassStrong",
  backdropBlur: "glassSm",
  color: "fg.muted",
  transition: "all 0.2s ease",
  "&:hover": { background: "bg.glass", color: "accent.pressed" },
});

const shareIconStyle = css({ width: "4.5", height: "4.5" });

const wishlistActiveStyle = css({
  background: "danger",
  color: "white",
});

const bodyStyle = css({ paddingTop: "3.5" });

const titleStyle = css({
  fontFamily: "display",
  fontSize: "md",
  fontWeight: "medium",
  letterSpacing: "wide",
  color: "fg.default",
  "&:hover": { color: "accent.pressed" },
});

const priceRowStyle = css({
  marginTop: "1.5",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "2",
});

const priceGroupStyle = css({ display: "flex", alignItems: "baseline", gap: "2", flexWrap: "wrap" });

const priceStyle = css({ fontFamily: "display", fontSize: "md", fontWeight: "semibold", color: "fg.default" });

const compareAtStyle = css({ fontSize: "xs", color: "fg.muted", textDecoration: "line-through" });


const lowStockStyle = css({ marginTop: "1", fontSize: "xs", fontWeight: "medium", color: "gold.600" });

// One quiet tag, not a wall of stickers — a card carrying every eligible
// label at once reads as discount-bin, not atelier. Rank the most telling
// claim first and show only that.
const tagStyle = css({
  position: "absolute",
  top: "3",
  left: "3",
  paddingInline: "2.5",
  paddingBlock: "1",
  borderRadius: "full",
  fontSize: "2xs",
  fontWeight: "semibold",
  letterSpacing: "wider",
  textTransform: "uppercase",
  backdropBlur: "glassSm",
});

const tagFeaturedStyle = css({
  background: "linear-gradient(135deg, {colors.gold.300}, {colors.gold.500})",
  color: "fg.onGold",
});

const tagLimitedStyle = css({
  background: "rgba(24,22,20,0.82)",
  color: "gold.200",
  border: "1px solid",
  borderColor: "gold.400",
});

const tagBestSellerStyle = css({
  background: "rgba(24,22,20,0.78)",
  color: "ivory.50",
});

const tagNewArrivalStyle = css({
  background: "bg.glassStrong",
  color: "fg.default",
  border: "1px solid",
  borderColor: "border.glass",
});

export function ProductCard({
  id,
  name,
  slug,
  price,
  compareAtPrice,
  images,
  isFeatured,
  isNewArrival,
  isBestSeller,
  isLimitedEdition,
  isWishlisted = false,
  stock = 0,
}: ProductCardProps) {
  const tag = isLimitedEdition
    ? { label: "Limited Edition", style: tagLimitedStyle }
    : isBestSeller
      ? { label: "Bestseller", style: tagBestSellerStyle }
      : isNewArrival
        ? { label: "New Arrival", style: tagNewArrivalStyle }
        : isFeatured
          ? { label: "Featured", style: tagFeaturedStyle }
          : null;
  const mainImage = images[0];
  const { data: session } = useSession();
  const [wishlisted, setWishlisted] = useState(isWishlisted);
  const [isLoading, setIsLoading] = useState(false);

  const handleWishlistToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!session) {
      toast.error("Please sign in to add items to your wishlist");
      return;
    }

    setIsLoading(true);

    try {
      if (wishlisted) {
        const response = await fetch(`/api/user/wishlist?productId=${id}`, {
          method: "DELETE",
        });

        if (response.ok) {
          setWishlisted(false);
          toast.success("Removed from wishlist");
        } else {
          throw new Error("Failed to remove from wishlist");
        }
      } else {
        const response = await fetch("/api/user/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId: id }),
        });

        if (response.ok) {
          setWishlisted(true);
          toast.success("Added to wishlist");
        } else {
          throw new Error("Failed to add to wishlist");
        }
      }
    } catch (error) {
      console.error("Wishlist toggle error:", error);
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cardStyle}>
      <div className={css({ position: "relative" })}>
        <Link href={`/product/${slug}`} className={imageBoxStyle}>
          <Image
            src={mainImage?.url || "/placeholder.jpg"}
            alt={mainImage?.alt || name}
            fill
            sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 45vw"
            className={imageStyle}
          />
        </Link>

        <button
          onClick={handleWishlistToggle}
          disabled={isLoading}
          className={cx(wishlistButtonStyle, wishlisted && wishlistActiveStyle)}
          aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
        >
          <Heart
            className={css({ width: "4.5", height: "4.5" })}
            fill={wishlisted ? "currentColor" : "none"}
          />
        </button>

        <ShareButton
          title={name}
          text={`Check out ${name} on LavIndia`}
          url={`/product/${slug}`}
          className={shareButtonStyle}
          iconClassName={shareIconStyle}
        />

        {tag && <span className={cx(tagStyle, tag.style)}>{tag.label}</span>}

        {stock === 0 && (
          <Badge
            variant="destructive"
            className={css({ position: "absolute", bottom: "3", left: "3" })}
          >
            Out of Stock
          </Badge>
        )}
      </div>
      <div className={bodyStyle}>
        <h3 className={titleStyle}>
          <Link href={`/product/${slug}`}>{name}</Link>
        </h3>
        <div className={priceRowStyle}>
          <div className={priceGroupStyle}>
            <span className={priceStyle}>₹{price.toLocaleString()}</span>
            {compareAtPrice && (
              <span className={compareAtStyle}>
                ₹{compareAtPrice.toLocaleString()}
              </span>
            )}
          </div>
          <AddToCartButton
            id={id}
            name={name}
            price={price}
            image={mainImage?.url}
            stock={stock}
            iconOnly
            shine
          />
        </div>
        {stock > 0 && stock <= 10 && (
          <div className={lowStockStyle}>Only {stock} left in stock!</div>
        )}
      </div>
    </div>
  );
}
