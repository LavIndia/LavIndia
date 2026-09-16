"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { css } from "styled-system/css";

type PromoBanner = {
  id: string;
  type: string;
  title: string | null;
  message: string;
  bgColor: string | null;
  textColor: string | null;
  isActive: boolean;
  startDate: Date | null;
  endDate: Date | null;
  order: number;
};

export function PromoBannersTable({ banners }: { banners: PromoBanner[] }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this banner?")) return;

    setIsDeleting(id);
    try {
      const response = await fetch(`/api/admin/promo-banners/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete banner");

      toast.success("Banner deleted successfully");
      router.refresh();
    } catch {
      toast.error("Failed to delete banner");
    } finally {
      setIsDeleting(null);
    }
  };

  const topScrollBanners = banners.filter((b) => b.type === "top_scroll");
  const freeGiftsBanners = banners.filter((b) => b.type === "free_gifts");
  const specialOfferBanners = banners.filter((b) => b.type === "special_offer");

  const renderTable = (items: PromoBanner[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className={css({ width: "15" })}>Order</TableHead>
          <TableHead>Preview</TableHead>
          <TableHead>Validity</TableHead>
          <TableHead className={css({ width: "25" })}>Status</TableHead>
          <TableHead className={css({ width: "25", textAlign: "right" })}>
            Actions
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={5}
              className={css({ textAlign: "center", paddingBlock: "8", color: "fg.muted" })}
            >
              No banners found
            </TableCell>
          </TableRow>
        ) : (
          items.map((banner) => (
            <TableRow key={banner.id}>
              <TableCell className={css({ fontWeight: "medium" })}>{banner.order}</TableCell>
              <TableCell>
                <div
                  className={css({
                    display: "flex",
                    alignItems: "center",
                    gap: "2",
                    maxWidth: "sm",
                  })}
                >
                  <div
                    className={css({
                      display: "flex",
                      alignItems: "center",
                      borderRadius: "full",
                      paddingInline: "3",
                      paddingBlock: "1.5",
                      fontSize: "xs",
                      fontWeight: "medium",
                      border: "1px solid",
                      borderColor: "border.subtle",
                      maxWidth: "full",
                      overflow: "hidden",
                    })}
                    style={{
                      background: banner.bgColor || undefined,
                      color: banner.textColor || undefined,
                    }}
                    title="Live preview of banner colors"
                  >
                    <span className={css({ truncate: true })}>
                      {banner.title ? `${banner.title} — ` : ""}
                      {banner.message}
                    </span>
                  </div>
                </div>
              </TableCell>
              <TableCell className={css({ fontSize: "sm" })}>
                {banner.startDate || banner.endDate ? (
                  <div>
                    {banner.startDate &&
                      format(new Date(banner.startDate), "MMM d")}{" "}
                    -{" "}
                    {banner.endDate &&
                      format(new Date(banner.endDate), "MMM d")}
                  </div>
                ) : (
                  "Always"
                )}
              </TableCell>
              <TableCell>
                <Badge variant={banner.isActive ? "default" : "secondary"}>
                  {banner.isActive ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell className={css({ textAlign: "right" })}>
                <div
                  className={css({
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: "2",
                  })}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      router.push(`/admin/promo-banners/${banner.id}`)
                    }
                    aria-label={`Edit banner ${banner.title || banner.message}`}
                  >
                    <Edit className={css({ width: "4", height: "4" })} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(banner.id)}
                    disabled={isDeleting === banner.id}
                    aria-label={`Delete banner ${banner.title || banner.message}`}
                  >
                    <Trash2 className={css({ width: "4", height: "4", color: "danger" })} />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  return (
    <Tabs defaultValue="top_scroll" className={css({ display: "flex", flexDirection: "column", gap: "4" })}>
      <TabsList>
        <TabsTrigger value="top_scroll">Top Scroll Messages</TabsTrigger>
        <TabsTrigger value="free_gifts">Free Gifts Banner</TabsTrigger>
        <TabsTrigger value="special_offer">Special Offers</TabsTrigger>
      </TabsList>

      <TabsContent
        value="top_scroll"
        className={css({ overflow: "hidden", borderRadius: "xl", border: "1px solid", borderColor: "border.subtle", background: "bg.surface", boxShadow: "card" })}
      >
        {renderTable(topScrollBanners)}
      </TabsContent>

      <TabsContent
        value="free_gifts"
        className={css({ overflow: "hidden", borderRadius: "xl", border: "1px solid", borderColor: "border.subtle", background: "bg.surface", boxShadow: "card" })}
      >
        {renderTable(freeGiftsBanners)}
      </TabsContent>

      <TabsContent
        value="special_offer"
        className={css({ overflow: "hidden", borderRadius: "xl", border: "1px solid", borderColor: "border.subtle", background: "bg.surface", boxShadow: "card" })}
      >
        {renderTable(specialOfferBanners)}
      </TabsContent>
    </Tabs>
  );
}
