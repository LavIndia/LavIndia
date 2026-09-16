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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ChevronDown, ChevronUp, Save } from "lucide-react";
import { toast } from "sonner";
import { css, cx } from "styled-system/css";

type HomePageSection = {
  id: string;
  name: string;
  title: string | null;
  isVisible: boolean;
  order: number;
};

export function HomePageLayoutTable({
  sections,
}: {
  sections: HomePageSection[];
}) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [editedSections, setEditedSections] =
    useState<HomePageSection[]>(sections);

  const updateSection = (
    id: string,
    field: keyof HomePageSection,
    value: boolean | number | string
  ) => {
    setEditedSections((prev) =>
      prev.map((section) =>
        section.id === id ? { ...section, [field]: value } : section
      )
    );
  };

  const sortedSections = [...editedSections].sort((a, b) => a.order - b.order);

  const moveSection = (id: string, direction: "up" | "down") => {
    const index = sortedSections.findIndex((section) => section.id === id);
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (index === -1 || targetIndex < 0 || targetIndex >= sortedSections.length)
      return;

    const current = sortedSections[index];
    const target = sortedSections[targetIndex];
    updateSection(current.id, "order", target.order);
    updateSection(target.id, "order", current.order);
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      // Update all sections
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
          })
        )
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
              <TableHead>Section Name</TableHead>
              <TableHead>Custom Title</TableHead>
              <TableHead className={css({ width: "36" })}>Visibility</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedSections.map((section, index) => (
              <TableRow
                key={section.id}
                className={cx(
                  !section.isVisible &&
                    css({ background: "bg.canvas", opacity: 0.7 }),
                )}
              >
                <TableCell>
                  <div className={css({ display: "flex", alignItems: "center", gap: "2" })}>
                    <div className={css({ display: "flex", flexDirection: "column", gap: "0.5" })}>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        onClick={() => moveSection(section.id, "up")}
                        disabled={index === 0}
                        aria-label={`Move ${section.name} up`}
                      >
                        <ChevronUp className={css({ width: "3.5", height: "3.5" })} />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        onClick={() => moveSection(section.id, "down")}
                        disabled={index === sortedSections.length - 1}
                        aria-label={`Move ${section.name} down`}
                      >
                        <ChevronDown className={css({ width: "3.5", height: "3.5" })} />
                      </Button>
                    </div>
                    <Input
                      type="number"
                      value={section.order}
                      onChange={(e) =>
                        updateSection(
                          section.id,
                          "order",
                          parseInt(e.target.value) || 0
                        )
                      }
                      className={css({ width: "16" })}
                    />
                  </div>
                </TableCell>
                <TableCell className={css({ fontWeight: "medium" })}>
                  {section.name}
                </TableCell>
                <TableCell>
                  <Input
                    value={section.title || ""}
                    onChange={(e) =>
                      updateSection(section.id, "title", e.target.value)
                    }
                    placeholder={`Default: ${section.name}`}
                  />
                </TableCell>
                <TableCell>
                  <div className={css({ display: "flex", alignItems: "center", gap: "2" })}>
                    <Switch
                      checked={section.isVisible}
                      onCheckedChange={(checked) =>
                        updateSection(section.id, "isVisible", checked)
                      }
                      aria-label={`Toggle visibility for ${section.name}`}
                    />
                    <Badge variant={section.isVisible ? "default" : "secondary"}>
                      {section.isVisible ? "Visible" : "Hidden"}
                    </Badge>
                  </div>
                </TableCell>
              </TableRow>
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
