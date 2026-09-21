"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { HomePageSectionRow } from "@/components/admin/homepage-layout/HomePageSectionRow";
import type {
  EditableSection,
  SectionCounts,
} from "@/components/admin/homepage-layout/homepage-layout-types";
import { css } from "styled-system/css";

/**
 * Ordering, retitling and hiding the bands of the homepage.
 *
 * Holds the edits and saves them; what a single band looks like is the row
 * component's business.
 */

export function HomePageLayoutTable({
  sections,
  counts = {},
}: {
  sections: EditableSection[];
  counts?: SectionCounts;
}) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [editedSections, setEditedSections] = useState<EditableSection[]>(sections);

  const updateSection = (
    id: string,
    field: keyof EditableSection,
    value: boolean | number | string,
  ) => {
    setEditedSections((prev) =>
      prev.map((section) => (section.id === id ? { ...section, [field]: value } : section)),
    );
  };

  const sortedSections = [...editedSections].sort((a, b) => a.order - b.order);

  const moveSection = (id: string, direction: "up" | "down") => {
    const index = sortedSections.findIndex((section) => section.id === id);
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (index === -1 || targetIndex < 0 || targetIndex >= sortedSections.length) return;

    const current = sortedSections[index];
    const target = sortedSections[targetIndex];
    updateSection(current.id, "order", target.order);
    updateSection(target.id, "order", current.order);
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      await Promise.all(
        editedSections.map((section) =>
          fetch(`/api/admin/homepage-sections/${section.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: section.title || null,
              isVisible: section.isVisible,
              order: section.order,
            }),
          }),
        ),
      );

      toast.success("Homepage layout updated successfully");
      router.refresh();
    } catch {
      toast.error("Failed to update homepage layout");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={css({ display: "flex", flexDirection: "column", gap: "4" })}>
      <Card className={css({ overflow: "hidden" })}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={css({ width: "36" })}>Order</TableHead>
              <TableHead>Section</TableHead>
              <TableHead className={css({ width: "18rem" })}>Custom Title</TableHead>
              <TableHead className={css({ width: "36" })}>Visibility</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedSections.map((section, index) => (
              <HomePageSectionRow
                key={section.id}
                section={section}
                count={counts[section.name]}
                isFirst={index === 0}
                isLast={index === sortedSections.length - 1}
                onMove={moveSection}
                onChange={updateSection}
              />
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className={css({ display: "flex", justifyContent: "flex-end" })}>
        <Button onClick={handleSaveAll} disabled={isSaving}>
          <Save className={css({ marginRight: "2", width: "4", height: "4" })} />
          {isSaving ? "Saving..." : "Save All Changes"}
        </Button>
      </div>
    </div>
  );
}
