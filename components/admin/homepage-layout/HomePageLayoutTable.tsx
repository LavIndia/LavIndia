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
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { GripVertical, Save } from "lucide-react";
import { toast } from "sonner";

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
    <div className="space-y-4">
      <Card className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">Order</TableHead>
              <TableHead>Section Name</TableHead>
              <TableHead>Custom Title</TableHead>
              <TableHead className="w-[100px]">Visible</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {editedSections
              .sort((a, b) => a.order - b.order)
              .map((section) => (
                <TableRow key={section.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        value={section.order}
                        onChange={(e) =>
                          updateSection(
                            section.id,
                            "order",
                            parseInt(e.target.value)
                          )
                        }
                        className="w-16"
                      />
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{section.name}</TableCell>
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
                    <Switch
                      checked={section.isVisible}
                      onCheckedChange={(checked) =>
                        updateSection(section.id, "isVisible", checked)
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSaveAll} disabled={isSaving}>
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? "Saving..." : "Save All Changes"}
        </Button>
      </div>
    </div>
  );
}
