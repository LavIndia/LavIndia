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
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Filter Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Price Range, Metal Type"
              required
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <Label>Slug</Label>
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="e.g., price-range"
              />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                onClick={generateSlug}
              >
                Auto Generate
              </Button>
            </div>
          </div>

          <div>
            <Label>Filter Type</Label>
            <Select value={type} onValueChange={setType}>
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

          <div>
            <Label>Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="isActive"
              checked={isActive}
              onCheckedChange={(checked) => setIsActive(checked as boolean)}
            />
            <Label htmlFor="isActive" className="cursor-pointer">
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
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {options.length > 0 && (
              <div className="space-y-2">
                {options.map((option, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{option.label}</div>
                      <div className="text-sm text-gray-600">{option.value}</div>
                    </div>
                    {option.color && (
                      <div
                        className="w-8 h-8 rounded-md border border-gray-200"
                        style={{ backgroundColor: option.color }}
                      />
                    )}
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => moveOption(idx, "up")}
                        disabled={idx === 0}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => moveOption(idx, "down")}
                        disabled={idx === options.length - 1}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeOption(idx)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium">Add New Option</div>
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
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={newOption.color || "#000000"}
                    onChange={(e) =>
                      setNewOption({ ...newOption, color: e.target.value })
                    }
                    className="w-20 h-10"
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
              <Button type="button" onClick={addOption} className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Add Option
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Assignment */}
      <Card>
        <CardHeader>
          <CardTitle>Assign to Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {categories.map((category) => (
              <div key={category.id} className="flex items-center gap-2">
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
                <Label
                  htmlFor={category.id}
                  className="cursor-pointer"
                >
                  {category.name}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-2 justify-end">
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
