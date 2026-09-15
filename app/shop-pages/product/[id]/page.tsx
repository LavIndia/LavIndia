"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HeaderSection } from "@/components/layout/HeaderSection";
import { FooterSection } from "@/components/layout/FooterSection";
import TopPromoBanner from "@/components/home/TopPromoBanner";
import { BreadcrumbNavigation } from "@/components/layout/BreadcrumbNavigation";
import AddToCartButton from "@/components/cart/AddToCartButton";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

// Mock reviews data - replace with API call later
const mockReviews = [
  {
    id: 1,
    user: "Alice",
    rating: 5,
    comment: "Absolutely stunning! Worth every penny.",
  },
  { id: 2, user: "Bob", rating: 4, comment: "Great quality, fast delivery." },
  {
    id: 3,
    user: "Charlie",
    rating: 5,
    comment: "Perfect for special occasions.",
  },
];

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

export default function ProductPage() {
  const params = useParams();
  const slug = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/products/${slug}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError("Product not found");
          } else {
            setError("Failed to load product");
          }
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
    }
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <TopPromoBanner />
        <HeaderSection />
        <main className="py-8">
          <div className="container mx-auto px-4">
            <div className="mb-6">
              <BreadcrumbNavigation />
            </div>
            <div className="text-center">Loading product...</div>
          </div>
        </main>
        <FooterSection />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white">
        <TopPromoBanner />
        <HeaderSection />
        <main className="py-8">
          <div className="container mx-auto px-4">
            <div className="mb-6">
              <BreadcrumbNavigation />
            </div>
            <div className="text-center text-red-600">
              <h1 className="text-2xl font-bold mb-4">Product Not Found</h1>
              <p>{error}</p>
              <p className="mt-4 text-gray-600">
                The product you&apos;re looking for doesn&apos;t exist or may
                have been removed.
              </p>
            </div>
          </div>
        </main>
        <FooterSection />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-white">
        <TopPromoBanner />
        <HeaderSection />
        <main className="py-8">
          <div className="container mx-auto px-4">
            <div className="mb-6">
              <BreadcrumbNavigation />
            </div>
            <div className="text-center">Product not found</div>
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
        <div className="container mx-auto px-4">
          {/* Breadcrumb */}
          <div className="mb-6">
            <BreadcrumbNavigation />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Image Gallery */}
            <div className="space-y-4">
              <Carousel className="w-full max-w-md mx-auto">
                <CarouselContent>
                  {product.images.map((img, index) => (
                    <CarouselItem key={index}>
                      <Image
                        src={img.url}
                        alt={img.alt}
                        width={400}
                        height={400}
                        className="w-full h-96 object-cover rounded-lg"
                      />
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
              </Carousel>
              <div className="flex gap-2 justify-center">
                {product.images.map((img, index) => (
                  <Image
                    key={index}
                    src={img.url}
                    alt={img.alt}
                    width={80}
                    height={80}
                    className="w-20 h-20 object-cover rounded cursor-pointer border-2 border-transparent hover:border-amber-500"
                  />
                ))}
              </div>
            </div>

            {/* Product Info */}
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {product.name}
                </h1>
                <p className="text-gray-600 mt-2">{product.description}</p>
                {product.isFeatured && <Badge className="mt-2">Featured</Badge>}
              </div>

              <div className="flex items-center gap-4">
                <span className="text-2xl font-bold text-gray-900">
                  ₹
                  {selectedVariant?.price.toLocaleString() ||
                    product.price.toLocaleString()}
                </span>
                {product.compareAtPrice && (
                  <span className="text-lg text-gray-500 line-through">
                    ₹{product.compareAtPrice.toLocaleString()}
                  </span>
                )}
              </div>

              {/* Variants */}
              {product.variants.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Options</h3>
                  <div className="flex gap-2 flex-wrap">
                    {product.variants.map((variant) => (
                      <Button
                        key={variant.id}
                        variant={
                          selectedVariant?.id === variant.id
                            ? "default"
                            : "outline"
                        }
                        onClick={() => setSelectedVariant(variant)}
                        disabled={variant.stock === 0}
                      >
                        {variant.name} - ₹{variant.price.toLocaleString()}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <AddToCartButton
                id={product.id}
                name={product.name}
                price={selectedVariant?.price || product.price}
                image={product.images[0].url}
                variantId={selectedVariant?.id}
                stock={selectedVariant?.stock || product.stock}
                className="w-full"
              />

              {selectedVariant && selectedVariant.stock === 0 && (
                <Badge
                  variant="destructive"
                  className="w-full justify-center py-2"
                >
                  Out of Stock
                </Badge>
              )}

              {selectedVariant &&
                selectedVariant.stock > 0 &&
                selectedVariant.stock <= 10 && (
                  <div className="text-sm text-orange-600 font-medium text-center">
                    Only {selectedVariant.stock} left in stock!
                  </div>
                )}

              {!selectedVariant && product.stock === 0 && (
                <Badge
                  variant="destructive"
                  className="w-full justify-center py-2"
                >
                  Out of Stock
                </Badge>
              )}

              {!selectedVariant && product.stock > 0 && product.stock <= 10 && (
                <div className="text-sm text-orange-600 font-medium text-center">
                  Only {product.stock} left in stock!
                </div>
              )}

              <div className="border-t my-4" />

              <div>
                <h3 className="text-lg font-semibold mb-2">Details</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  {selectedVariant ? (
                    <>
                      <li>
                        Material: {selectedVariant.material || "Not specified"}
                      </li>
                      <li>Color: {selectedVariant.color || "Not specified"}</li>
                      <li>Size: {selectedVariant.size || "Not specified"}</li>
                      <li>Stock: {selectedVariant.stock} available</li>
                    </>
                  ) : (
                    <>
                      <li>Category: {product.category.name}</li>
                      <li>SKU: {product.sku || "Not available"}</li>
                      <li>Price: ₹{product.price.toLocaleString()}</li>
                      {product.compareAtPrice && (
                        <li>
                          Original Price: ₹
                          {product.compareAtPrice.toLocaleString()}
                        </li>
                      )}
                    </>
                  )}
                </ul>
              </div>
            </div>
          </div>

          {/* Reviews */}
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6">Customer Reviews</h2>
            <div className="space-y-4">
              {mockReviews.map((review) => (
                <div key={review.id} className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold">{review.user}</span>
                    <div className="flex">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span
                          key={i}
                          className={
                            i < review.rating
                              ? "text-yellow-400"
                              : "text-gray-300"
                          }
                        >
                          ★
                        </span>
                      ))}
                    </div>
                  </div>
                  <p className="text-gray-700">{review.comment}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <FooterSection />
    </div>
  );
}
