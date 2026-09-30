/** A Piece Set row in plain words: "Category is Earrings", "Price up to ₹600". */
import type { PieceRule } from "@/modules/promotions/contracts";
import type { NameLookup } from "@/modules/promotions/summarise";

const rupees = (c: number) => `₹${(c / 100).toLocaleString("en-IN")}`;
const LABEL: Record<PieceRule["field"], string> = {
  category: "Category",
  collection: "Collection",
  product: "Piece",
  tag: "Tag",
  price: "Price",
  colour: "Colour",
  material: "Material",
  size: "Size",
};

export function describeRule(rule: PieceRule, names: NameLookup): string {
  if (rule.field === "price") {
    if (rule.op === "under") return `Price up to ${rupees(rule.maxCents ?? 0)}`;
    if (rule.op === "over") return `Price from ${rupees(rule.minCents ?? 0)}`;
    return `Price ${rupees(rule.minCents ?? 0)}–${rupees(rule.maxCents ?? 0)}`;
  }
  const table =
    rule.field === "category"
      ? names.categories
      : rule.field === "collection"
        ? names.collections
        : rule.field === "product"
          ? names.products
          : null;
  const values = (rule.values ?? []).map((v) => (table ? (table[v] ?? "removed") : v.replace(/-/g, " ")));
  return `${LABEL[rule.field]} ${rule.op === "isNot" ? "is not" : "is"} ${values.join(" or ") || "—"}`;
}
