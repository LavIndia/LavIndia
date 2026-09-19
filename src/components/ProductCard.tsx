"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Heart, Eye } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import AddToCartButton from "@/components/cart/AddToCartButton";
import { ShareButton } from "@/components/ShareButton";
import { QuickViewModal } from "@/components/product/QuickViewModal";
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

import {
  cardStyle,
  imageBoxStyle,
  imageStyle,
  wishlistButtonStyle,
  quickViewButtonStyle,
  cardHoverStyle,
  shareButtonStyle,
  shareIconStyle,
  wishlistActiveStyle,
  bodyStyle,
  titleStyle,
  priceRowStyle,
  priceGroupStyle,
  priceStyle,
  compareAtStyle,
  lowStockStyle,
  tagStyle,
  tagFeaturedStyle,
  tagLimitedStyle,
  tagBestSellerStyle,
  tagNewArrivalStyle,
} from "./product-card.styles";

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
  const [quickViewOpen, setQuickViewOpen] = useState(false);

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
    <div className={cx(cardStyle, cardHoverStyle)}>
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

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setQuickViewOpen(true);
          }}
          className={cx(quickViewButtonStyle, "quick-view-trigger")}
          aria-label={`Quick view ${name}`}
          title="Quick view"
        >
          <Eye className={css({ width: "4.5", height: "4.5" })} />
        </button>
      </div>

      <QuickViewModal
        slug={quickViewOpen ? slug : null}
        onOpenChange={(open) => setQuickViewOpen(open)}
      />
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
