import { loadCatalogFacts } from "@/modules/promotions";
import type { CatalogOptions } from "@/components/admin/promotions/PieceFilterEditor";
import type { TestPiece } from "@/components/admin/promotions/TestCartPanel";

/** What the offer editor's pickers, summary and test cart need — one read. */
export async function loadEditorData() {
  const facts = await loadCatalogFacts();
  const options: CatalogOptions = {
    categories: facts.categories,
    collections: facts.collections,
    products: facts.products,
    materials: facts.materials,
    colors: facts.colors,
    sizes: facts.sizes,
  };
  const pieces: TestPiece[] = facts.pieces.map((p) => ({
    variantId: p.variantId,
    productId: p.productId,
    label: p.variantName ? `${p.productName} — ${p.variantName}` : p.productName,
    categoryId: p.categoryId,
    collectionIds: p.collectionIds,
    material: p.material,
    color: p.color,
    size: p.size,
    priceCents: p.priceCents,
  }));
  return { options, pieces, names: facts.names };
}
