"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import Image from "next/image";
import { Heart, Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { HeaderSection } from "@/components/layout/HeaderSection";
import { FooterSection } from "@/components/layout/FooterSection";
import TopPromoBanner from "@/components/home/TopPromoBanner";
import { BreadcrumbNavigation } from "@/components/layout/BreadcrumbNavigation";
import AddToCartButton from "@/components/cart/AddToCartButton";
import { ShareButton } from "@/components/ShareButton";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { css, cx } from "styled-system/css";
import { trackProductEvent } from "@/lib/analytics-client";

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  sku: string | null;
  isFeatured: boolean;
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

interface Variant {
  id: string;
  name: string;
  price: number;
  color: string | null;
  size: string | null;
  material: string | null;
  stock: number;
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  isVerifiedPurchase: boolean;
  createdAt: string;
  userName: string;
}

const pageStyle = css({ minHeight: "100vh", background: "bg.canvas" });
const mainStyle = css({ paddingBlock: { base: "6", md: "10" } });
const containerStyle = css({
  maxWidth: "7xl",
  marginInline: "auto",
  paddingInline: { base: "4", md: "6" },
});
const crumbStyle = css({ marginBottom: "6" });
const centerTextStyle = css({ textAlign: "center", color: "fg.muted", paddingBlock: "12" });
const errorHeadingStyle = css({
  fontFamily: "display",
  fontSize: "2xl",
  fontWeight: "bold",
  color: "fg.default",
  marginBottom: "4",
});
const errorTextStyle = css({ color: "danger" });
const errorSubTextStyle = css({ marginTop: "4", color: "fg.muted" });

const gridStyle = css({
  display: "grid",
  gridTemplateColumns: { base: "1fr", lg: "1fr 1fr" },
  gap: { base: "6", lg: "10" },
});

const galleryColStyle = css({ display: "flex", flexDirection: "column", gap: "4" });
const carouselStyle = css({ width: "full", maxWidth: { base: "full", md: "md" }, marginInline: "auto" });
const imageBoxStyle = css({
  position: "relative",
  width: "full",
  aspectRatio: "1 / 1",
  overflow: "hidden",
  borderRadius: "lg",
  boxShadow: "card",
  background: "bg.surface",
  cursor: "zoom-in",
  // Dwell-zoom: no JS timer needed — a long `transition-duration` on the
  // hover state itself acts as the "the longer you look, the closer it
  // gets" effect. Snaps back quickly on mouse-leave so it never feels
  // sluggish to browse away. Hover has no effect on touch devices (there's
  // no sustained pointer to dwell with), so touch gets a tap-to-inspect
  // fullscreen viewer instead — see the onClick below.
  "&:hover img": {
    transform: "scale(1.28)",
    transition: "transform 4.5s cubic-bezier(0.16, 1, 0.3, 1)",
  },
});
const mainImageStyle = css({
  objectFit: "cover",
  transition: "transform 0.35s ease",
});
const lightboxContentStyle = css({
  maxWidth: "min(90vw, 42rem)",
  width: "full",
  padding: "3",
  background: "bg.canvas",
});
const lightboxImageWrapStyle = css({
  position: "relative",
  width: "full",
  aspectRatio: "1 / 1",
});

const thumbRowStyle = css({ display: "flex", gap: "2", justifyContent: "center", flexWrap: "wrap" });
const thumbStyle = (active: boolean) =>
  css({
    width: "16",
    height: "16",
    objectFit: "cover",
    borderRadius: "md",
    cursor: "pointer",
    border: "2px solid",
    borderColor: active ? "accent.default" : "transparent",
    opacity: active ? 1 : 0.7,
    transition: "border-color 0.15s ease, opacity 0.15s ease",
    "&:hover": { opacity: 1, borderColor: "accent.default" },
  });

const infoColStyle = css({ display: "flex", flexDirection: "column", gap: "6" });
const titleBlockStyle = css({ display: "flex", flexDirection: "column", gap: "2" });
const titleRowStyle = css({ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "3" });
const nameStyle = css({ fontFamily: "display", fontSize: { base: "2xl", md: "3xl" }, fontWeight: "bold", color: "fg.default" });
const descStyle = css({ color: "fg.muted" });

const wishlistButtonStyle = (active: boolean) =>
  css({
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: "0",
    height: "11",
    width: "11",
    borderRadius: "full",
    border: "1px solid",
    borderColor: active ? "danger" : "border.subtle",
    background: active ? "rgba(138,44,59,0.08)" : "bg.surface",
    color: active ? "danger" : "fg.muted",
    cursor: "pointer",
    transition: "all 0.15s ease",
    "&:hover": { borderColor: "danger", color: "danger" },
  });

const titleActionsStyle = css({ display: "flex", alignItems: "center", gap: "2", flexShrink: "0" });

const shareButtonStyle = css({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: "0",
  height: "11",
  width: "11",
  borderRadius: "full",
  border: "1px solid",
  borderColor: "border.subtle",
  background: "bg.surface",
  color: "fg.muted",
  cursor: "pointer",
  transition: "all 0.15s ease",
  "&:hover": { borderColor: "accent.default", color: "accent.pressed" },
});

const ratingRowStyle = css({ display: "flex", alignItems: "center", gap: "2", fontSize: "sm", color: "fg.muted" });
const ratingStarsStyle = css({ display: "flex", color: "gold.400" });

const priceRowStyle = css({ display: "flex", alignItems: "baseline", gap: "4", flexWrap: "wrap" });
const priceStyle = css({ fontFamily: "display", fontSize: { base: "2xl", md: "3xl" }, fontWeight: "bold", color: "fg.default" });
const compareAtStyle = css({ fontSize: "lg", color: "fg.muted", textDecoration: "line-through" });

const sectionLabelStyle = css({ fontFamily: "body", fontSize: "md", fontWeight: "semibold", color: "fg.default", marginBottom: "2" });
const variantRowStyle = css({ display: "flex", gap: "2", flexWrap: "wrap" });

const addRowStyle = css({ display: "flex", gap: "3", alignItems: "stretch" });
const qtyStepperStyle = css({
  display: "flex",
  alignItems: "center",
  border: "1px solid",
  borderColor: "border.subtle",
  borderRadius: "full",
  overflow: "hidden",
  flexShrink: "0",
});
const qtyButtonStyle = css({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "10",
  height: "11",
  cursor: "pointer",
  color: "fg.default",
  "&:hover": { background: "bg.surface" },
  "&:disabled": { opacity: 0.4, cursor: "not-allowed" },
});
const qtyValueStyle = css({ width: "8", textAlign: "center", fontWeight: "medium", fontVariantNumeric: "tabular-nums" });

const outOfStockBadgeStyle = css({ width: "full", justifyContent: "center", paddingBlock: "2" });
const lowStockStyle = css({ fontSize: "sm", color: "gold.600", fontWeight: "medium", textAlign: "center" });

const dividerStyle = css({ borderTop: "1px solid", borderColor: "border.subtle", marginBlock: "4" });

const detailsListStyle = css({ fontSize: "sm", color: "fg.muted", display: "flex", flexDirection: "column", gap: "1" });

const reviewsSectionStyle = css({ marginTop: { base: "10", md: "14" } });
const reviewsHeaderStyle = css({ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "3", marginBottom: "5" });
const reviewsHeadingStyle = css({ fontFamily: "display", fontSize: "2xl", fontWeight: "bold", color: "fg.default" });
const reviewsSummaryStyle = css({ display: "flex", alignItems: "center", gap: "2", color: "fg.muted", fontSize: "sm" });
const reviewsListStyle = css({ display: "flex", flexDirection: "column", gap: "3" });
const reviewCardStyle = css({
  border: "1px solid",
  borderColor: "border.subtle",
  borderRadius: "lg",
  padding: "4",
  background: "bg.surface",
  display: "flex",
  flexDirection: "column",
  gap: "1.5",
});
const reviewHeaderStyle = css({ display: "flex", alignItems: "center", gap: "2", flexWrap: "wrap" });
const reviewUserStyle = css({ fontWeight: "semibold", color: "fg.default" });
const starsStyle = css({ display: "flex", color: "gold.400" });
const reviewCommentStyle = css({ color: "fg.muted" });
const noReviewsStyle = css({ color: "fg.muted", fontSize: "sm", paddingBlock: "6" });
const reviewDeleteButtonStyle = css({
  marginLeft: "auto",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  color: "fg.muted",
  padding: "1",
  borderRadius: "md",
  "&:hover": { color: "danger", background: "bg.surface" },
  "&:disabled": { opacity: 0.5, cursor: "not-allowed" },
});

const writeReviewCardStyle = css({
  border: "1px solid",
  borderColor: "border.subtle",
  borderRadius: "lg",
  padding: "4",
  background: "bg.glass",
  backdropBlur: "glassSm",
  marginBottom: "5",
  display: "flex",
  flexDirection: "column",
  gap: "2.5",
});
const starPickerStyle = css({ display: "flex", gap: "1" });
const starButtonStyle = (filled: boolean) =>
  css({
    cursor: "pointer",
    fontSize: "xl",
    lineHeight: "1",
    color: filled ? "gold.400" : "onyx.200",
    background: "transparent",
    "&:hover": { color: "gold.300" },
  });

function Stars({ rating, size = "sm" }: { rating: number; size?: "sm" | "lg" }) {
  return (
    <div className={size === "lg" ? ratingStarsStyle : starsStyle}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i}>{i < Math.round(rating) ? "★" : "☆"}</span>
      ))}
    </div>
  );
}

export function ProductPageClient() {
  const params = useParams();
  const slug = params.id as string;
  const { data: session } = useSession();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [qty, setQty] = useState(1);
  const [wishlisted, setWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [api, setApi] = useState<CarouselApi>();
  const [activeImage, setActiveImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewAverage, setReviewAverage] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);
  const isAdmin = session?.user?.role === "ADMIN";

  useEffect(() => {
    if (!api) return;
    setActiveImage(api.selectedScrollSnap());
    api.on("select", () => setActiveImage(api.selectedScrollSnap()));
  }, [api]);

  const fetchReviews = useCallback(async () => {
    try {
      setReviewsLoading(true);
      const res = await fetch(`/api/products/${slug}/reviews`);
      if (!res.ok) return;
      const data = await res.json();
      setReviews(data.reviews);
      setReviewAverage(data.average);
      setReviewCount(data.count);
    } catch (err) {
      console.error("Error fetching reviews:", err);
    } finally {
      setReviewsLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/products/${slug}`);
        if (!res.ok) {
          setError(res.status === 404 ? "Product not found" : "Failed to load product");
          return;
        }
        const productData = await res.json();
        setProduct(productData);
        setSelectedVariant(productData.variants[0] || null);
      } catch (err) {
        console.error("Error fetching product:", err);
        setError("Failed to load product");
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchProduct();
      fetchReviews();
    }
  }, [slug, fetchReviews]);

  // Real view-duration tracking (Admin > Analytics > Product Engagement) —
  // fires once when the shopper actually navigates away or hides the tab,
  // using the real elapsed time on this exact product, not a guess.
  useEffect(() => {
    if (!product?.id) return;
    const startedAt = performance.now();
    const productId = product.id;
    let sent = false;

    const sendDuration = () => {
      if (sent) return;
      sent = true;
      trackProductEvent({
        productId,
        type: "VIEW",
        durationMs: performance.now() - startedAt,
      });
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") sendDuration();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      sendDuration();
    };
  }, [product?.id]);

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
    } catch (err) {
      console.error("Wishlist error:", err);
      toast.error("Something went wrong");
    } finally {
      setWishlistLoading(false);
    }
  };

  const submitReview = async () => {
    if (!session) {
      toast.error("Please sign in to write a review");
      return;
    }
    if (myRating === 0) {
      toast.error("Please select a star rating");
      return;
    }
    if (!myComment.trim()) {
      toast.error("Please write a comment");
      return;
    }
    setSubmittingReview(true);
    try {
      const res = await fetch(`/api/products/${slug}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: myRating, comment: myComment.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to submit review");
      }
      toast.success("Thank you — your review has been posted");
      setMyRating(0);
      setMyComment("");
      fetchReviews();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit review");
    } finally {
      setSubmittingReview(false);
    }
  };

  const deleteReview = async (reviewId: string) => {
    if (!confirm("Delete this review? This cannot be undone.")) return;
    setDeletingReviewId(reviewId);
    try {
      const res = await fetch(`/api/products/${slug}/reviews?reviewId=${reviewId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to delete review");
      }
      toast.success("Review deleted");
      fetchReviews();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete review");
    } finally {
      setDeletingReviewId(null);
    }
  };

  const currentStock = selectedVariant?.stock ?? product?.stock ?? 0;

  useEffect(() => {
    setQty(1);
  }, [selectedVariant?.id]);

  if (loading) {
    return (
      <div className={pageStyle}>
        <TopPromoBanner />
        <HeaderSection />
        <main className={mainStyle}>
          <div className={containerStyle}>
            <div className={crumbStyle}>
              <BreadcrumbNavigation />
            </div>
            <div className={centerTextStyle}>Loading product...</div>
          </div>
        </main>
        <FooterSection />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className={pageStyle}>
        <TopPromoBanner />
        <HeaderSection />
        <main className={mainStyle}>
          <div className={containerStyle}>
            <div className={crumbStyle}>
              <BreadcrumbNavigation />
            </div>
            <div className={css({ textAlign: "center" })}>
              <h1 className={errorHeadingStyle}>Product Not Found</h1>
              <p className={errorTextStyle}>{error}</p>
              <p className={errorSubTextStyle}>
                The product you&apos;re looking for doesn&apos;t exist or may have been removed.
              </p>
            </div>
          </div>
        </main>
        <FooterSection />
      </div>
    );
  }

  return (
    <div className={pageStyle}>
      <TopPromoBanner />
      <HeaderSection />
      <main className={mainStyle}>
        <div className={containerStyle}>
          <div className={crumbStyle}>
            <BreadcrumbNavigation currentLabel={product.name} />
          </div>

          <div className={gridStyle}>
            {/* Image Gallery */}
            <div className={galleryColStyle}>
              <Carousel className={carouselStyle} setApi={setApi}>
                <CarouselContent>
                  {product.images.map((img, index) => (
                    <CarouselItem key={index}>
                      <div
                        className={imageBoxStyle}
                        onClick={() => setLightboxOpen(true)}
                        role="button"
                        tabIndex={0}
                        aria-label="View full-size image"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") setLightboxOpen(true);
                        }}
                      >
                        <Image
                          src={img.url}
                          alt={img.alt}
                          fill
                          sizes="(min-width: 768px) 448px, 100vw"
                          className={mainImageStyle}
                          priority={index === 0}
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
              </Carousel>
              {product.images.length > 1 && (
                <div className={thumbRowStyle}>
                  {product.images.map((img, index) => (
                    <Image
                      key={index}
                      src={img.url}
                      alt={img.alt}
                      width={80}
                      height={80}
                      onClick={() => api?.scrollTo(index)}
                      className={thumbStyle(index === activeImage)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Fullscreen image viewer — the touch/tap equivalent of the
                desktop dwell-zoom (hover has no meaning on a touchscreen,
                so tapping the photo opens a real close-up instead). */}
            <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
              <DialogContent className={lightboxContentStyle}>
                <div className={lightboxImageWrapStyle}>
                  <Image
                    src={product.images[activeImage]?.url}
                    alt={product.images[activeImage]?.alt || product.name}
                    fill
                    sizes="90vw"
                    className={css({ objectFit: "contain" })}
                  />
                </div>
              </DialogContent>
            </Dialog>

            {/* Product Info */}
            <div className={infoColStyle}>
              <div className={titleBlockStyle}>
                <div className={titleRowStyle}>
                  <h1 className={nameStyle}>{product.name}</h1>
                  <div className={titleActionsStyle}>
                    <ShareButton
                      title={product.name}
                      text={`Check out ${product.name} on LavIndia`}
                      url={`/product/${product.slug}`}
                      className={shareButtonStyle}
                      iconClassName={css({ width: "4.5", height: "4.5" })}
                    />
                    <button
                      type="button"
                      onClick={toggleWishlist}
                      disabled={wishlistLoading}
                      className={wishlistButtonStyle(wishlisted)}
                      aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
                    >
                      <Heart size={18} fill={wishlisted ? "currentColor" : "none"} />
                    </button>
                  </div>
                </div>
                {reviewCount > 0 && (
                  <div className={ratingRowStyle}>
                    <Stars rating={reviewAverage} />
                    <span>
                      {reviewAverage.toFixed(1)} · {reviewCount} review{reviewCount === 1 ? "" : "s"}
                    </span>
                  </div>
                )}
                <p className={descStyle}>{product.description}</p>
                {product.isFeatured && <Badge className={css({ width: "fit-content" })}>Featured</Badge>}
              </div>

              <div className={priceRowStyle}>
                <span className={priceStyle}>
                  ₹{(selectedVariant?.price ?? product.price).toLocaleString()}
                </span>
                {product.compareAtPrice && (
                  <span className={compareAtStyle}>₹{product.compareAtPrice.toLocaleString()}</span>
                )}
              </div>

              {product.variants.length > 0 && (
                <div>
                  <h3 className={sectionLabelStyle}>Options</h3>
                  <div className={variantRowStyle}>
                    {product.variants.map((variant) => (
                      <Button
                        key={variant.id}
                        variant={selectedVariant?.id === variant.id ? "default" : "outline"}
                        onClick={() => setSelectedVariant(variant)}
                        disabled={variant.stock === 0}
                      >
                        {variant.name} - ₹{variant.price.toLocaleString()}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className={sectionLabelStyle}>Quantity</h3>
                <div className={addRowStyle}>
                  <div className={qtyStepperStyle}>
                    <button
                      type="button"
                      className={qtyButtonStyle}
                      onClick={() => setQty((q) => Math.max(1, q - 1))}
                      disabled={qty <= 1}
                      aria-label="Decrease quantity"
                    >
                      <Minus size={14} />
                    </button>
                    <span className={qtyValueStyle}>{qty}</span>
                    <button
                      type="button"
                      className={qtyButtonStyle}
                      onClick={() => setQty((q) => Math.min(currentStock || 1, q + 1))}
                      disabled={qty >= currentStock}
                      aria-label="Increase quantity"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <AddToCartButton
                    id={product.id}
                    name={product.name}
                    price={selectedVariant?.price || product.price}
                    image={product.images[0].url}
                    variantId={selectedVariant?.id}
                    variantLabel={selectedVariant?.name}
                    stock={currentStock}
                    qty={qty}
                    shine
                    className={css({ flex: "1" })}
                  />
                </div>
              </div>

              {currentStock === 0 && (
                <Badge variant="destructive" className={outOfStockBadgeStyle}>
                  Out of Stock
                </Badge>
              )}
              {currentStock > 0 && currentStock <= 10 && (
                <div className={lowStockStyle}>Only {currentStock} left in stock!</div>
              )}

              <div className={dividerStyle} />

              <div>
                <h3 className={sectionLabelStyle}>Details</h3>
                <ul className={detailsListStyle}>
                  {selectedVariant ? (
                    <>
                      {/* A field with no value is left out entirely rather
                          than printed as "Not specified" — an empty label
                          tells a customer nothing and reads as neglect. */}
                      {selectedVariant.material && <li>Material: {selectedVariant.material}</li>}
                      {selectedVariant.color && <li>Color: {selectedVariant.color}</li>}
                      {selectedVariant.size && <li>Size: {selectedVariant.size}</li>}
                      <li>Stock: {selectedVariant.stock} available</li>
                    </>
                  ) : (
                    <>
                      <li>Category: {product.category.name}</li>
                      {product.sku && <li>SKU: {product.sku}</li>}
                      <li>Price: ₹{product.price.toLocaleString()}</li>
                      {product.compareAtPrice && (
                        <li>Original Price: ₹{product.compareAtPrice.toLocaleString()}</li>
                      )}
                    </>
                  )}
                </ul>
              </div>
            </div>
          </div>

          {/* Reviews */}
          <div className={reviewsSectionStyle}>
            <div className={reviewsHeaderStyle}>
              <h2 className={reviewsHeadingStyle}>Customer Reviews</h2>
              {reviewCount > 0 && (
                <div className={reviewsSummaryStyle}>
                  <Stars rating={reviewAverage} size="lg" />
                  <span>
                    {reviewAverage.toFixed(1)} out of 5 · {reviewCount} review{reviewCount === 1 ? "" : "s"}
                  </span>
                </div>
              )}
            </div>

            <div className={writeReviewCardStyle}>
              <h3 className={sectionLabelStyle}>Write a review</h3>
              <div className={starPickerStyle}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    className={starButtonStyle(i < myRating)}
                    onClick={() => setMyRating(i + 1)}
                    aria-label={`Rate ${i + 1} star${i === 0 ? "" : "s"}`}
                  >
                    {i < myRating ? "★" : "☆"}
                  </button>
                ))}
              </div>
              <Textarea
                value={myComment}
                onChange={(e) => setMyComment(e.target.value)}
                placeholder={
                  session
                    ? "Share your experience with this piece…"
                    : "Sign in to write a review"
                }
                disabled={!session}
                rows={3}
              />
              <Button
                onClick={submitReview}
                disabled={!session || submittingReview}
                className={css({ alignSelf: "flex-start" })}
              >
                {submittingReview ? "Posting…" : "Post Review"}
              </Button>
            </div>

            <div className={reviewsListStyle}>
              {reviewsLoading ? (
                <div className={noReviewsStyle}>Loading reviews…</div>
              ) : reviews.length === 0 ? (
                <div className={noReviewsStyle}>
                  No reviews yet — be the first to share your experience with this piece.
                </div>
              ) : (
                reviews.map((review) => (
                  <div key={review.id} className={reviewCardStyle}>
                    <div className={reviewHeaderStyle}>
                      <span className={reviewUserStyle}>{review.userName}</span>
                      <div className={starsStyle}>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span key={i}>{i < review.rating ? "★" : "☆"}</span>
                        ))}
                      </div>
                      {review.isVerifiedPurchase && (
                        <Badge variant="secondary">Verified Purchase</Badge>
                      )}
                      {isAdmin && (
                        <button
                          type="button"
                          className={reviewDeleteButtonStyle}
                          onClick={() => deleteReview(review.id)}
                          disabled={deletingReviewId === review.id}
                          aria-label="Delete review"
                          title="Delete review"
                        >
                          <Trash2 className={css({ width: "4", height: "4" })} />
                        </button>
                      )}
                    </div>
                    <p className={reviewCommentStyle}>{review.comment}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
      <FooterSection />
    </div>
  );
}
