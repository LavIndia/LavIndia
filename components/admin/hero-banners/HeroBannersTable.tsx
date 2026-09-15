"use client";

import { useEffect, useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Edit,
  Trash2,
  GripVertical,
  ImageIcon,
  Layers3,
  X,
  Save,
} from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";

type HeroBanner = {
  id: string;
  title: string;
  subtitle: string | null;
  imagePath: string;
  linkUrl: string | null;
  order: number;
  active: boolean;
  createdAt: Date;
};

const noDestinationValue = "__none__";

export function HeroBannersTable({ banners }: { banners: HeroBanner[] }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [destinationChanges, setDestinationChanges] = useState<
    Record<string, string>
  >({});
  const [isSavingChanges, setIsSavingChanges] = useState(false);
  const [destinationOptions, setDestinationOptions] = useState<
    Array<{ value: string; label: string }>
  >([]);

  useEffect(() => {
    fetch("/api/admin/hero-banners/destinations")
      .then((response) => (response.ok ? response.json() : null))
      .then((result) => setDestinationOptions(result?.destinations || []))
      .catch(() => toast.error("Could not load destination options"));
  }, []);

  const allSelected =
    banners.length > 0 && selectedIds.length === banners.length;
  const toggleSelected = (id: string, checked: boolean) => {
    setSelectedIds((current) =>
      checked
        ? [...current, id]
        : current.filter((selectedId) => selectedId !== id),
    );
  };

  const toggleAll = (checked: boolean) => {
    setSelectedIds(checked ? banners.map((banner) => banner.id) : []);
  };

  const getDestination = (banner: HeroBanner) =>
    destinationChanges[banner.id] ?? banner.linkUrl ?? "/shop";

  const handleDestinationChange = (id: string, value: string) => {
    setDestinationChanges((current) => ({ ...current, [id]: value }));
  };

  const handleSaveChanges = async () => {
    const updates = Object.entries(destinationChanges).map(([id, linkUrl]) => ({
      id,
      linkUrl: linkUrl === noDestinationValue ? null : linkUrl,
    }));
    if (updates.length === 0) return;

    setIsSavingChanges(true);
    try {
      const response = await fetch("/api/admin/hero-banners", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to save changes");
      }

      toast.success(
        `${updates.length} banner${updates.length === 1 ? "" : "s"} updated`,
      );
      setDestinationChanges({});
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save changes",
      );
    } finally {
      setIsSavingChanges(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this banner?")) return;

    setIsDeleting(id);
    try {
      const response = await fetch(`/api/admin/hero-banners/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete banner");

      toast.success("Banner deleted successfully");
      setSelectedIds((current) =>
        current.filter((selectedId) => selectedId !== id),
      );
      router.refresh();
    } catch (error) {
      toast.error("Failed to delete banner");
      console.error(error);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (
      !confirm(
        `Delete ${selectedIds.length} selected banner${selectedIds.length === 1 ? "" : "s"}?`,
      )
    ) {
      return;
    }

    setIsBulkDeleting(true);
    try {
      const response = await fetch("/api/admin/hero-banners", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Failed to delete banners");

      toast.success(
        `${result.deleted} banner${result.deleted === 1 ? "" : "s"} deleted`,
      );
      setSelectedIds([]);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete banners",
      );
    } finally {
      setIsBulkDeleting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex min-h-12 items-center justify-between gap-3 rounded-xl border bg-card px-4 py-2 shadow-sm">
        <div className="flex items-center gap-3">
          <Checkbox
            checked={allSelected}
            onCheckedChange={(checked) => toggleAll(checked === true)}
            aria-label="Select all banners"
          />
          <div className="flex items-center gap-2 text-sm">
            <Layers3 className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
              {selectedIds.length > 0
                ? `${selectedIds.length} selected`
                : `${banners.length} banners`}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {Object.keys(destinationChanges).length > 0 && (
            <Button
              type="button"
              size="sm"
              onClick={handleSaveChanges}
              disabled={isSavingChanges}
            >
              <Save className="mr-2 h-4 w-4" />
              {isSavingChanges
                ? "Saving..."
                : `Save ${Object.keys(destinationChanges).length} change${Object.keys(destinationChanges).length === 1 ? "" : "s"}`}
            </Button>
          )}
          {selectedIds.length > 0 && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds([])}
                disabled={isBulkDeleting}
              >
                <X className="mr-2 h-4 w-4" />
                Clear
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                disabled={isBulkDeleting}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {isBulkDeleting ? "Deleting..." : "Delete selected"}
              </Button>
            </>
          )}
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[48px]">
                <span className="sr-only">Select</span>
              </TableHead>
              <TableHead className="w-[50px]">Order</TableHead>
              <TableHead className="w-[100px]">Image</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Subtitle</TableHead>
              <TableHead>Link</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[100px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {banners.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center text-muted-foreground py-8"
                >
                  No banners found. Create your first banner to get started.
                </TableCell>
              </TableRow>
            ) : (
              banners.map((banner) => (
                <TableRow key={banner.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(banner.id)}
                      onCheckedChange={(checked) =>
                        toggleSelected(banner.id, checked === true)
                      }
                      aria-label={`Select ${banner.title}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                      <span className="font-medium">{banner.order}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="relative w-16 h-10 rounded overflow-hidden">
                      <Image
                        src={banner.imagePath}
                        alt={banner.title}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{banner.title}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {banner.subtitle || "-"}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={getDestination(banner)}
                      onValueChange={(value) =>
                        handleDestinationChange(banner.id, value)
                      }
                    >
                      <SelectTrigger className="h-9 w-[170px]">
                        <SelectValue placeholder="Loading destinations..." />
                      </SelectTrigger>
                      <SelectContent>
                        {destinationOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                        <SelectItem value={noDestinationValue}>
                          No link
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Badge variant={banner.active ? "default" : "secondary"}>
                      {banner.active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          router.push(`/admin/hero-banners/${banner.id}`)
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
      </div>
    </div>
  );
}
