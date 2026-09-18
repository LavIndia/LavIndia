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
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
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
import { css } from "styled-system/css";

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
  const [togglingId, setTogglingId] = useState<string | null>(null);
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

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    setTogglingId(id);
    try {
      const response = await fetch(`/api/admin/hero-banners/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !currentStatus }),
      });
      if (!response.ok) throw new Error("Failed to update banner");

      toast.success(
        currentStatus
          ? "Banner hidden from the storefront (kept as a draft)"
          : "Banner is live on the storefront",
      );
      router.refresh();
    } catch (error) {
      toast.error("Failed to update banner");
      console.error(error);
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        "Permanently delete this banner? This removes it and its image for good — use the Active toggle instead if you just want to hide it. This cannot be undone.",
      )
    )
      return;

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
        `Permanently delete ${selectedIds.length} selected banner${selectedIds.length === 1 ? "" : "s"}? This removes them and their images for good. This cannot be undone.`,
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
    <div className={css({ display: "flex", flexDirection: "column", gap: "3" })}>
      <div
        className={css({
          display: "flex",
          minHeight: "12",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "3",
          borderRadius: "xl",
          border: "1px solid",
          borderColor: "border.subtle",
          background: "bg.surface",
          paddingInline: "4",
          paddingBlock: "2",
          boxShadow: "card",
        })}
      >
        <div className={css({ display: "flex", alignItems: "center", gap: "3" })}>
          <Checkbox
            checked={allSelected}
            onCheckedChange={(checked) => toggleAll(checked === true)}
            aria-label="Select all banners"
          />
          <div className={css({ display: "flex", alignItems: "center", gap: "2", fontSize: "sm" })}>
            <Layers3 className={css({ width: "4", height: "4", color: "fg.muted" })} />
            <span className={css({ fontWeight: "medium" })}>
              {selectedIds.length > 0
                ? `${selectedIds.length} selected`
                : `${banners.length} banners`}
            </span>
          </div>
        </div>
        <div className={css({ display: "flex", alignItems: "center", gap: "2" })}>
          {Object.keys(destinationChanges).length > 0 && (
            <Button
              type="button"
              size="sm"
              onClick={handleSaveChanges}
              disabled={isSavingChanges}
            >
              <Save className={css({ marginRight: "2", width: "4", height: "4" })} />
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
                <X className={css({ marginRight: "2", width: "4", height: "4" })} />
                Clear
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                disabled={isBulkDeleting}
              >
                <Trash2 className={css({ marginRight: "2", width: "4", height: "4" })} />
                {isBulkDeleting ? "Deleting..." : "Delete selected"}
              </Button>
            </>
          )}
        </div>
      </div>
      <div
        className={css({
          overflow: "hidden",
          borderRadius: "xl",
          border: "1px solid",
          borderColor: "border.subtle",
          background: "bg.surface",
          boxShadow: "card",
        })}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={css({ width: "12" })}>
                <span className={css({ srOnly: true })}>Select</span>
              </TableHead>
              <TableHead className={css({ width: "12.5" })}>Order</TableHead>
              <TableHead className={css({ width: "25" })}>Image</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Subtitle</TableHead>
              <TableHead>Link</TableHead>
              <TableHead className={css({ width: "25" })}>Status</TableHead>
              <TableHead className={css({ width: "25", textAlign: "right" })}>
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {banners.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className={css({
                    textAlign: "center",
                    color: "fg.muted",
                    paddingBlock: "8",
                  })}
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
                    <div className={css({ display: "flex", alignItems: "center", gap: "2" })}>
                      <GripVertical
                        className={css({ width: "4", height: "4", color: "fg.muted", cursor: "move" })}
                      />
                      <span className={css({ fontWeight: "medium" })}>{banner.order}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div
                      className={css({
                        position: "relative",
                        width: "16",
                        height: "10",
                        borderRadius: "sm",
                        overflow: "hidden",
                        border: "1px solid",
                        borderColor: "border.subtle",
                      })}
                    >
                      <Image
                        src={banner.imagePath}
                        alt={banner.title}
                        fill
                        className={css({ objectFit: "cover" })}
                        sizes="64px"
                      />
                    </div>
                  </TableCell>
                  <TableCell className={css({ fontWeight: "medium" })}>
                    <div className={css({ display: "flex", alignItems: "center", gap: "2" })}>
                      <ImageIcon
                        className={css({ width: "4", height: "4", flexShrink: 0, color: "fg.muted" })}
                      />
                      <span className={css({ truncate: true })}>{banner.title}</span>
                    </div>
                  </TableCell>
                  <TableCell className={css({ fontSize: "sm", color: "fg.muted" })}>
                    {banner.subtitle || "-"}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={getDestination(banner)}
                      onValueChange={(value) =>
                        handleDestinationChange(banner.id, value)
                      }
                    >
                      <SelectTrigger className={css({ height: "9", width: "42.5" })}>
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
                    <div className={css({ display: "flex", alignItems: "center", gap: "2" })}>
                      <Switch
                        checked={banner.active}
                        onCheckedChange={() =>
                          handleToggleActive(banner.id, banner.active)
                        }
                        disabled={togglingId === banner.id}
                        aria-label={
                          banner.active
                            ? `Hide ${banner.title} from the storefront`
                            : `Show ${banner.title} on the storefront`
                        }
                      />
                      <span className={css({ fontSize: "sm", color: banner.active ? "fg.default" : "fg.muted" })}>
                        {banner.active ? "Active" : "Draft"}
                      </span>
                    </div>
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
                          router.push(`/admin/hero-banners/${banner.id}`)
                        }
                        aria-label={`Edit ${banner.title}`}
                      >
                        <Edit className={css({ width: "4", height: "4" })} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(banner.id)}
                        disabled={isDeleting === banner.id}
                        aria-label={`Delete ${banner.title}`}
                      >
                        <Trash2
                          className={css({ width: "4", height: "4", color: "danger" })}
                        />
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
