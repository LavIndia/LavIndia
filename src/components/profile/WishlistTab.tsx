"use client";

import Image from "next/image";
import { Heart, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProfileEmptyState } from "@/components/profile/ProfileEmptyState";
import type { WishlistItem } from "@/components/profile/profile-types";
import { sectionHeadingStyle } from "@/components/profile/profile.styles";
import { css } from "styled-system/css";

const gridStyle = css({
  display: "grid",
  gap: "6",
  gridTemplateColumns: "1fr",
  sm: { gridTemplateColumns: "repeat(2, 1fr)" },
  lg: { gridTemplateColumns: "repeat(3, 1fr)" },
  xl: { gridTemplateColumns: "repeat(4, 1fr)" },
});

const nameStyle = css({
  fontWeight: "medium",
  marginBottom: "2",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  color: "fg.default",
});

const priceStyle = css({
  fontFamily: "display",
  fontSize: "lg",
  fontWeight: "bold",
  marginBottom: "3",
  color: "fg.default",
});

export interface WishlistTabProps {
  wishlist: WishlistItem[];
  onBrowse: () => void;
  onView: (productId: string) => void;
  onRemove: (productId: string) => void;
}

export function WishlistTab({ wishlist, onBrowse, onView, onRemove }: WishlistTabProps) {
  return (
    <>
      <h2 className={sectionHeadingStyle}>My Wishlist</h2>

      {wishlist.length === 0 ? (
        <ProfileEmptyState
          icon={Heart}
          title="Your wishlist is empty"
          description="Add items you love to your wishlist"
          actionLabel="Browse Products"
          onAction={onBrowse}
        />
      ) : (
        <div className={gridStyle}>
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
                <h3 className={nameStyle}>{item.product.name}</h3>
                <p className={priceStyle}>
                  ₹{((item.product.priceCents || 0) / 100).toLocaleString()}
                </p>
                <div className={css({ display: "flex", gap: "2" })}>
                  <Button
                    variant="outline"
                    size="sm"
                    className={css({ flex: "1" })}
                    onClick={() => onView(item.product.id)}
                  >
                    View
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onRemove(item.product.id)}>
                    <Trash2 className={css({ h: "4", w: "4", color: "danger" })} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
