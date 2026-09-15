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
          <TableHead className="w-[60px]">Order</TableHead>
          <TableHead>Title</TableHead>
          <TableHead>Message</TableHead>
          <TableHead>Colors</TableHead>
          <TableHead>Validity</TableHead>
          <TableHead className="w-[100px]">Status</TableHead>
          <TableHead className="w-[100px] text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={7}
              className="text-center py-8 text-muted-foreground"
            >
              No banners found
            </TableCell>
          </TableRow>
        ) : (
          items.map((banner) => (
            <TableRow key={banner.id} className="hover:bg-muted/40">
              <TableCell className="font-medium">{banner.order}</TableCell>
              <TableCell>{banner.title || "-"}</TableCell>
              <TableCell className="max-w-md truncate">
                {banner.message}
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  {banner.bgColor && (
                    <div className="flex items-center gap-1">
                      <div
                        className="w-4 h-4 rounded border"
                        style={{ backgroundColor: banner.bgColor }}
                      />
                      <span className="text-xs text-muted-foreground">BG</span>
                    </div>
                  )}
                  {banner.textColor && (
                    <div className="flex items-center gap-1">
                      <div
                        className="w-4 h-4 rounded border"
                        style={{ backgroundColor: banner.textColor }}
                      />
                      <span className="text-xs text-muted-foreground">
                        Text
                      </span>
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-sm">
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
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      router.push(`/admin/promo-banners/${banner.id}`)
                    }
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(banner.id)}
                    disabled={isDeleting === banner.id}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
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
    <Tabs defaultValue="top_scroll" className="space-y-4">
      <TabsList>
        <TabsTrigger value="top_scroll">Top Scroll Messages</TabsTrigger>
        <TabsTrigger value="free_gifts">Free Gifts Banner</TabsTrigger>
        <TabsTrigger value="special_offer">Special Offers</TabsTrigger>
      </TabsList>

      <TabsContent
        value="top_scroll"
        className="overflow-hidden rounded-xl border bg-card shadow-sm"
      >
        {renderTable(topScrollBanners)}
      </TabsContent>

      <TabsContent
        value="free_gifts"
        className="overflow-hidden rounded-xl border bg-card shadow-sm"
      >
        {renderTable(freeGiftsBanners)}
      </TabsContent>

      <TabsContent
        value="special_offer"
        className="overflow-hidden rounded-xl border bg-card shadow-sm"
      >
        {renderTable(specialOfferBanners)}
      </TabsContent>
    </Tabs>
  );
}
