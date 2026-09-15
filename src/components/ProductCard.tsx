"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Heart } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import AddToCartButton from "@/components/cart/AddToCartButton";

interface ProductCardProps {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  price: number;
  compareAtPrice?: number | null;
  images: Array<{ url: string; alt: string }>;
  isFeatured?: boolean;
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

export function ProductCard({
  id,
  name,
  slug,
  description,
  price,
  compareAtPrice,
  images,
  isFeatured,
  isWishlisted = false,
  stock = 0,
  variants,
}: ProductCardProps) {
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
        // Remove from wishlist
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
        // Add to wishlist
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
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group">
      <div className="relative">
        <Link href={`/product/${slug}`}>
          <Image
            src={mainImage?.url || "/placeholder.jpg"}
            alt={mainImage?.alt || name}
            width={400}
            height={400}
            className="w-full h-64 object-cover cursor-pointer group-hover:scale-105 transition-transform duration-500"
          />
        </Link>

        {/* Wishlist Button */}
        <button
          onClick={handleWishlistToggle}
          disabled={isLoading}
          className={`absolute top-3 right-3 p-2 rounded-full transition-all duration-300 ${
            wishlisted
              ? "bg-red-500 text-white"
              : "bg-white/90 text-gray-600 hover:bg-red-500 hover:text-white"
          } shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed`}
          aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
        >
          <Heart
            className={`w-5 h-5 transition-transform ${
              wishlisted ? "fill-current scale-110" : ""
            }`}
          />
        </button>

        {isFeatured && (
          <Badge className="absolute top-3 left-3 bg-amber-500">Featured</Badge>
        )}

        {stock === 0 && (
          <Badge className="absolute bottom-3 left-3 bg-red-500">
            Out of Stock
          </Badge>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          <Link href={`/product/${slug}`} className="hover:text-amber-600">
            {name}
          </Link>
        </h3>
        <p className="text-sm text-gray-600 mb-2 line-clamp-2">{description}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-gray-900">
              ₹{price.toLocaleString()}
            </span>
            {compareAtPrice && (
              <span className="text-sm text-gray-500 line-through">
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
            className="h-9"
          />
        </div>
        {stock > 0 && stock <= 10 && (
          <div className="mt-1 text-xs text-orange-600 font-medium">
            Only {stock} left in stock!
          </div>
        )}
        {variants && variants.length > 0 && (
          <div className="mt-1 text-xs text-gray-600">
            {variants.length} options available
          </div>
        )}
      </div>
    </div>
  );
}
