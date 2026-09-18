"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Heart, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import AddToCartButton from "@/components/cart/AddToCartButton";
import { css, cx } from "styled-system/css";

interface QuickViewProduct {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  images: Array<{ url: string; alt: string }>;
  variants: Array<{
    id: string;
    name: string;
    price: number;
    color: string | null;
    size: string | null;
    material: string | null;
    stock: number;
  }>;
  category: { name: string; slug: string };
}

const modalStyle = css({ maxWidth: { base: "full", md: "44rem" } });

const layoutStyle = css({
  display: "grid",
  gridTemplateColumns: { base: "1fr", sm: "1fr 1fr" },
  gap: "5",
});

const imageBoxStyle = css({
  position: "relative",
  width: "full",
  aspectRatio: "1 / 1",
  borderRadius: "lg",
  overflow: "hidden",
  background: "bg.surface",
});

const bodyStyle = css({ display: "flex", flexDirection: "column", gap: "3" });

const categoryStyle = css({ fontSize: "xs", color: "fg.muted", textTransform: "uppercase", letterSpacing: "wide" });

const titleStyle = css({ fontFamily: "display", fontSize: "xl", fontWeight: "semibold", color: "fg.default" });

const priceRowStyle = css({ display: "flex", alignItems: "baseline", gap: "2", flexWrap: "wrap" });
const priceStyle = css({ fontFamily: "display", fontSize: "lg", fontWeight: "semibold", color: "fg.default" });
const compareAtStyle = css({ fontSize: "sm", color: "fg.muted", textDecoration: "line-through" });

const descriptionStyle = css({
  fontSize: "sm",
  color: "fg.muted",
  lineClamp: 4,
});

const variantRowStyle = css({ display: "flex", flexWrap: "wrap", gap: "2" });
const variantButtonStyle = (active: boolean) =>
  css({
    paddingInline: "3",
    paddingBlock: "1.5",
    borderRadius: "full",
    fontSize: "xs",
    fontWeight: "medium",
    border: "1px solid",
    borderColor: active ? "accent.pressed" : "border.subtle",
    background: active ? "accent.subtle" : "transparent",
    color: active ? "accent.pressed" : "fg.default",
    cursor: "pointer",
    "&:disabled": { opacity: 0.4, cursor: "not-allowed", textDecoration: "line-through" },
  });

const stockStyle = css({ fontSize: "xs", fontWeight: "medium", color: "gold.600" });
const outOfStockStyle = css({ fontSize: "xs", fontWeight: "medium", color: "danger" });

const actionsRowStyle = css({ display: "flex", alignItems: "center", gap: "3", marginTop: "1" });

const wishlistButtonStyle = cx(
  css({
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "full",
    height: "10",
    width: "10",
    border: "1px solid",
    borderColor: "border.subtle",
    color: "fg.muted",
    cursor: "pointer",
    "&:hover": { color: "danger" },
    "&:disabled": { opacity: 0.5, cursor: "not-allowed" },
  })
);
const wishlistActiveStyle = css({ color: "danger", borderColor: "danger" });

const detailsLinkStyle = css({ fontSize: "sm", color: "accent.pressed", "&:hover": { textDecoration: "underline" } });

const centerStyle = css({ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "16rem" });

export function QuickViewModal({
  slug,
  onOpenChange,
}: {
  slug: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: session } = useSession();
  const [product, setProduct] = useState<QuickViewProduct | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [wishlisted, setWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    setProduct(null);
    fetch(`/api/products/${slug}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        setProduct(data);
        setSelectedVariantId(data?.variants?.[0]?.id ?? null);
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load product");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const selectedVariant = product?.variants.find((v) => v.id === selectedVariantId) ?? null;
  const currentStock = selectedVariant?.stock ?? product?.stock ?? 0;
  const currentPrice = selectedVariant?.price ?? product?.price ?? 0;

  const toggleWishlist = async () => {
    if (!product) return;
    if (!session) {
      toast.error("Please sign in to add items to your wishlist");
      return;
    }
    setWishlistLoading(true);
    try {
      if (wishlisted) {
        const res = await fetch(`/api/user/wishlist?productId=${product.id}`, { method: "DELETE" });
        if (res.ok) {
          setWishlisted(false);
          toast.success("Removed from wishlist");
        }
      } else {
        const res = await fetch("/api/user/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId: product.id }),
        });
        if (res.ok) {
          setWishlisted(true);
          toast.success("Added to wishlist");
        }
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setWishlistLoading(false);
    }
  };

  return (
    <Dialog open={!!slug} onOpenChange={onOpenChange}>
      <DialogContent className={modalStyle}>
        {loading || !product ? (
          <div className={centerStyle}>
            <Loader2 className={css({ height: "8", width: "8", animation: "spin", color: "fg.muted" })} />
          </div>
        ) : (
          <div className={layoutStyle}>
            <div className={imageBoxStyle}>
              <Image
                src={product.images[0]?.url || "/placeholder.jpg"}
                alt={product.images[0]?.alt || product.name}
                fill
                sizes="(min-width: 640px) 22rem, 90vw"
                className={css({ objectFit: "cover" })}
              />
            </div>
            <div className={bodyStyle}>
              <span className={categoryStyle}>{product.category?.name}</span>
              <h2 className={titleStyle}>{product.name}</h2>
              <div className={priceRowStyle}>
                <span className={priceStyle}>₹{currentPrice.toLocaleString()}</span>
                {product.compareAtPrice && (
                  <span className={compareAtStyle}>₹{product.compareAtPrice.toLocaleString()}</span>
                )}
              </div>
              {product.description && <p className={descriptionStyle}>{product.description}</p>}

              {product.variants.length > 0 && (
                <div className={variantRowStyle}>
                  {product.variants.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      className={variantButtonStyle(v.id === selectedVariantId)}
                      onClick={() => setSelectedVariantId(v.id)}
                      disabled={v.stock === 0}
                    >
                      {v.name}
                    </button>
                  ))}
                </div>
              )}

              {currentStock === 0 ? (
                <Badge variant="destructive" className={css({ alignSelf: "flex-start" })}>
                  Out of Stock
                </Badge>
              ) : currentStock <= 10 ? (
                <span className={stockStyle}>Only {currentStock} left in stock!</span>
              ) : null}

              <div className={actionsRowStyle}>
                <AddToCartButton
                  id={product.id}
                  name={product.name}
                  price={currentPrice}
                  image={product.images[0]?.url}
                  variantId={selectedVariant?.id}
                  variantLabel={selectedVariant?.name}
                  stock={currentStock}
                  shine
                />
                <button
                  type="button"
                  onClick={toggleWishlist}
                  disabled={wishlistLoading}
                  className={cx(wishlistButtonStyle, wishlisted && wishlistActiveStyle)}
                  aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
                >
                  <Heart className={css({ height: "4.5", width: "4.5" })} fill={wishlisted ? "currentColor" : "none"} />
                </button>
              </div>

              <Link href={`/product/${product.slug}`} className={detailsLinkStyle}>
                View full details →
              </Link>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function useQuickView() {
  const [quickViewSlug, setQuickViewSlug] = useState<string | null>(null);
  return { quickViewSlug, setQuickViewSlug };
}
