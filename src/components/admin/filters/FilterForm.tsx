"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { css } from "styled-system/css";

interface FilterOption {
  id?: string;
  label: string;
  value: string;
  color?: string | null;
  order: number;
}

interface FilterFormProps {
  filter?: {
    id: string;
    name: string;
    slug: string;
    type: string;
    description?: string | null;
    isActive: boolean;
    order: number;
    options: FilterOption[];
    categories: Array<{ category: { id: string; name: string } }>;
  };
  categories: Array<{ id: string; name: string }>;
}

const formStyle = css({ display: "flex", flexDirection: "column", gap: "6" });
const cardBodyStyle = css({ display: "flex", flexDirection: "column", gap: "4" });
const fieldStyle = css({ display: "flex", flexDirection: "column", gap: "1.5" });
const requiredMarkStyle = css({ color: "danger", marginLeft: "0.5" });

const slugRowStyle = css({ display: "flex", flexDirection: "column", gap: "3", sm: { flexDirection: "row" } });
const slugFieldStyle = css({ flex: "1", display: "flex", flexDirection: "column", gap: "1.5" });
const autoGenWrapStyle = css({ display: "flex", alignItems: "flex-end" });

const checkboxRowStyle = css({ display: "flex", alignItems: "center", gap: "2" });
const checkboxLabelStyle = css({ cursor: "pointer" });

const optionsListStyle = css({ display: "flex", flexDirection: "column", gap: "2" });
const optionRowStyle = css({
  display: "flex",
  alignItems: "center",
  gap: "2",
  padding: "3",
  background: "bg.canvas",
  borderRadius: "lg",
  border: "1px solid",
  borderColor: "border.subtle",
});
const optionInfoStyle = css({ flex: "1" });
const optionLabelStyle = css({ fontWeight: "medium", color: "fg.default" });
const optionValueStyle = css({ fontSize: "sm", color: "fg.muted" });
const swatchStyle = css({
  width: "8",
  height: "8",
  borderRadius: "md",
  border: "1px solid",
  borderColor: "border.subtle",
  flexShrink: 0,
});
const optionActionsStyle = css({ display: "flex", gap: "1" });

const addOptionBoxStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "3",
  padding: "3",
  background: "bg.canvas",
  borderRadius: "lg",
  border: "1px solid",
  borderColor: "border.subtle",
});
const addOptionTitleStyle = css({ fontSize: "sm", fontWeight: "medium", color: "fg.default" });
const colorRowStyle = css({ display: "flex", gap: "2" });
const colorSwatchInputStyle = css({ width: "20", height: "10", padding: "1" });
const fullWidthIconStyle = css({ marginRight: "2", height: "4", width: "4" });

const categoriesListStyle = css({ display: "flex", flexDirection: "column", gap: "2" });
const categoryRowStyle = css({ display: "flex", alignItems: "center", gap: "2" });

const actionsRowStyle = css({ display: "flex", gap: "2", justifyContent: "flex-end" });

export function FilterForm({ filter, categories }: FilterFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(filter?.name || "");
  const [slug, setSlug] = useState(filter?.slug || "");
  const [type, setType] = useState<string>(filter?.type || "CHECKBOX");
  const [description, setDescription] = useState(filter?.description || "");
  const [isActive, setIsActive] = useState(filter?.isActive ?? true);
  const [options, setOptions] = useState<FilterOption[]>(
    filter?.options || []
  );
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    filter?.categories.map((fc) => fc.category.id) || []
  );
  const [newOption, setNewOption] = useState({
    label: "",
    value: "",
    color: "",
  });

  const generateSlug = () => {
    const generatedSlug = name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^\w-]/g, "");
    setSlug(generatedSlug);
  };

  const addOption = () => {
    if (!newOption.label || !newOption.value) {
      toast.error("Label and Value are required");
      return;
    }

    setOptions([
      ...options,
      { ...newOption, order: options.length, label: newOption.label, value: newOption.value },
    ]);
    setNewOption({ label: "", value: "", color: "" });
  };

  const removeOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const moveOption = (index: number, direction: "up" | "down") => {
    const newOptions = [...options];
    if (direction === "up" && index > 0) {
      [newOptions[index], newOptions[index - 1]] = [
        newOptions[index - 1],
        newOptions[index],
      ];
    } else if (direction === "down" && index < newOptions.length - 1) {
      [newOptions[index], newOptions[index + 1]] = [
        newOptions[index + 1],
        newOptions[index],
      ];
    }
    setOptions(
      newOptions.map((opt, idx) => ({ ...opt, order: idx }))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !slug) {
      toast.error("Name and Slug are required");
      return;
    }

    setLoading(true);
    try {
      const url = filter
        ? `/api/admin/filters/${filter.id}`
        : `/api/admin/filters`;
      const method = filter ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug,
          type,
          description,
          isActive,
          options: options.map((opt) => ({
            label: opt.label,
            value: opt.value,
            color: opt.color || null,
            order: opt.order,
          })),
          categoryIds: selectedCategories,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to save filter");
      }

      toast.success(
        filter ? "Filter updated successfully" : "Filter created successfully"
      );
      router.push("/admin/filters");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save filter");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={formStyle}>
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Information</CardTitle>
        </CardHeader>
        <CardContent className={cardBodyStyle}>
          <div className={fieldStyle}>
            <Label>
              Filter Name
              <span className={requiredMarkStyle}>*</span>
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Price Range, Metal Type"
              required
            />
          </div>

          <div className={slugRowStyle}>
            <div className={slugFieldStyle}>
              <Label>
                Slug
                <span className={requiredMarkStyle}>*</span>
              </Label>
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="e.g., price-range"
                required
              />
            </div>
            <div className={autoGenWrapStyle}>
              <Button
                type="button"
                variant="outline"
                onClick={generateSlug}
              >
                Auto Generate
              </Button>
            </div>
          </div>

          <div className={fieldStyle}>
            <Label>
              Filter Type
              <span className={requiredMarkStyle}>*</span>
            </Label>
            <Select value={type} onValueChange={setType} isRequired>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CHECKBOX">Checkbox (Multi-select)</SelectItem>
                <SelectItem value="DROPDOWN">Dropdown</SelectItem>
                <SelectItem value="RANGE">Price Range</SelectItem>
                <SelectItem value="COLOR">Color</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className={fieldStyle}>
            <Label>Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
            />
          </div>

          <div className={checkboxRowStyle}>
            <Checkbox
              id="isActive"
              checked={isActive}
              onCheckedChange={(checked) => setIsActive(checked as boolean)}
            />
            <Label htmlFor="isActive" className={checkboxLabelStyle}>
              Active
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Filter Options */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Options</CardTitle>
        </CardHeader>
        <CardContent className={cardBodyStyle}>
          {options.length > 0 && (
            <div className={optionsListStyle}>
              {options.map((option, idx) => (
                <div key={idx} className={optionRowStyle}>
                  <div className={optionInfoStyle}>
                    <div className={optionLabelStyle}>{option.label}</div>
                    <div className={optionValueStyle}>{option.value}</div>
                  </div>
                  {option.color && (
                    <div
                      className={swatchStyle}
                      style={{ backgroundColor: option.color }}
                    />
                  )}
                  <div className={optionActionsStyle}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => moveOption(idx, "up")}
                      disabled={idx === 0}
                      aria-label="Move option up"
                    >
                      <ChevronUp className={css({ height: "4", width: "4" })} />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => moveOption(idx, "down")}
                      disabled={idx === options.length - 1}
                      aria-label="Move option down"
                    >
                      <ChevronDown className={css({ height: "4", width: "4" })} />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeOption(idx)}
                      aria-label="Remove option"
                    >
                      <Trash2 className={css({ height: "4", width: "4", color: "danger" })} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className={addOptionBoxStyle}>
            <div className={addOptionTitleStyle}>Add New Option</div>
            <Input
              value={newOption.label}
              onChange={(e) =>
                setNewOption({ ...newOption, label: e.target.value })
              }
              placeholder="Option Label (e.g., Under ₹5,000)"
            />
            <Input
              value={newOption.value}
              onChange={(e) =>
                setNewOption({ ...newOption, value: e.target.value })
              }
              placeholder="Option Value (e.g., 0-5000)"
            />
            {type === "COLOR" && (
              <div className={colorRowStyle}>
                <Input
                  type="color"
                  value={newOption.color || "#000000"}
                  onChange={(e) =>
                    setNewOption({ ...newOption, color: e.target.value })
                  }
                  className={colorSwatchInputStyle}
                />
                <Input
                  value={newOption.color}
                  onChange={(e) =>
                    setNewOption({ ...newOption, color: e.target.value })
                  }
                  placeholder="Hex code"
                />
              </div>
            )}
            <Button type="button" onClick={addOption} className={css({ width: "full" })}>
              <Plus className={fullWidthIconStyle} />
              Add Option
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Category Assignment */}
      <Card>
        <CardHeader>
          <CardTitle>Assign to Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={categoriesListStyle}>
            {categories.map((category) => (
              <div key={category.id} className={categoryRowStyle}>
                <Checkbox
                  id={category.id}
                  checked={selectedCategories.includes(category.id)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedCategories([
                        ...selectedCategories,
                        category.id,
                      ]);
                    } else {
                      setSelectedCategories(
                        selectedCategories.filter((id) => id !== category.id)
                      );
                    }
                  }}
                />
                <Label htmlFor={category.id} className={checkboxLabelStyle}>
                  {category.name}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className={actionsRowStyle}>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading
            ? "Saving..."
            : filter
              ? "Update Filter"
              : "Create Filter"}
        </Button>
      </div>
    </form>
  );
}
