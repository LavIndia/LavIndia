import {
  ALL_PIECES_ID,
  categorySetId,
  collectionSetId,
  loadCatalogFacts,
  loadSetLibrarySource,
} from "@/modules/promotions";
import type { CatalogOptions } from "@/components/admin/promotions/ProductPicker";
import type { SetOption } from "@/components/admin/promotions/SetPicker";
import type { TestPiece } from "@/components/admin/promotions/TestCartPanel";

/** What the offer editor's pickers, summary and test cart need. */
export async function loadEditorData() {
  const [facts, setSource] = await Promise.all([loadCatalogFacts(), loadSetLibrarySource()]);
  const options: CatalogOptions = {
    categories: facts.categories,
    collections: facts.collections,
    products: facts.products,
    materials: facts.materials,
    colors: facts.colors,
    sizes: facts.sizes,
    tags: facts.tags,
  };
  const sets: SetOption[] = [
    ...setSource.stored.filter((s) => !s.archivedAt).map((s) => ({ id: s.id, name: s.name, kind: "saved" as const })),
    ...facts.categories.map((c) => ({ id: categorySetId(c.id), name: c.name, kind: "category" as const })),
    ...facts.collections.map((c) => ({ id: collectionSetId(c.id), name: c.name, kind: "collection" as const })),
  ];
  const pieces: TestPiece[] = facts.pieces.map((p) => ({
    variantId: p.variantId,
    productId: p.productId,
    label: p.variantName ? `${p.productName} — ${p.variantName}` : p.productName,
    categoryId: p.categoryId,
    collectionIds: p.collectionIds,
    material: p.material,
    color: p.color,
    size: p.size,
    tags: p.tags,
    priceCents: p.priceCents,
  }));
  const names = {
    ...facts.names,
    sets: {
      [ALL_PIECES_ID]: "All pieces",
      ...Object.fromEntries(sets.map((s) => [s.id, s.name])),
      ...Object.fromEntries(setSource.stored.map((s) => [s.id, s.name])),
    },
  };
  return { options, pieces, names, sets };
}
