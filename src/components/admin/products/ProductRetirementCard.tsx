"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { css } from "styled-system/css";

const contentStyle = css({ display: "flex", flexDirection: "column", gap: "3" });
const hintStyle = css({ fontSize: "sm", color: "fg.muted" });

interface ProductRetirementCardProps {
  productId: string;
  retiredAt: Date | string | null;
  /** Keeps the form's own copy of isPublished in step, so a later Save does
   *  not put a sold-out retired piece back on the storefront. */
  onPublishedChange: (isPublished: boolean) => void;
}

function formatDate(value: Date | string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Retire or reinstate a product. Retiring means the shop will never stock
 * the piece again: what is on the shelf keeps selling, no new stock can be
 * received, and it leaves the storefront by itself when the last one sells.
 */
export function ProductRetirementCard({
  productId,
  retiredAt,
  onPublishedChange,
}: ProductRetirementCardProps) {
  const router = useRouter();
  const [working, setWorking] = useState(false);
  const retired = Boolean(retiredAt);

  const toggle = async () => {
    setWorking(true);
    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ retired: !retired }),
      });
      if (!res.ok) throw new Error();
      const product = await res.json();
      onPublishedChange(Boolean(product.isPublished));
      toast.success(retired ? "Reinstated — it can be restocked again" : "Retired");
      router.refresh();
    } catch {
      toast.error(retired ? "Failed to reinstate product" : "Failed to retire product");
    } finally {
      setWorking(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className={css({ fontSize: "md" })}>
          {retired ? "Retired" : "In the range"}
        </CardTitle>
      </CardHeader>
      <CardContent className={contentStyle}>
        <p className={hintStyle}>
          {retiredAt
            ? `Retired on ${formatDate(retiredAt)}. What is left keeps selling; it cannot be restocked, and it leaves the storefront when the last piece sells.`
            : "Retire a piece you will never stock again. What is on the shelf keeps selling, and it leaves the storefront by itself when the last one sells."}
        </p>
        <Button type="button" variant="outline" size="sm" onClick={toggle} disabled={working}>
          {working && <Loader2 className={css({ height: "4", width: "4", animation: "spin" })} />}
          {retired ? "Reinstate" : "Retire this piece"}
        </Button>
      </CardContent>
    </Card>
  );
}
