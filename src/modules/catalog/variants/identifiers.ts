/**
 * Generation of the two identifiers a sellable variant carries.
 *
 * SKU and barcode are deliberately different things:
 *
 *   SKU      a human-facing stock code an operator can read aloud and type,
 *            shaped from the product slug so it is recognisable on a shelf.
 *   Barcode  a machine-facing internal Code 128 code. It is LavIndia-internal
 *            and is NOT a registered EAN/GTIN — we must never describe it as
 *            one, and it is not valid outside our own systems.
 *
 * Both are allocated from one Postgres sequence so a collision is impossible
 * without a uniqueness retry loop.
 */
import type { Tx } from "../../_shared/db";
import { prisma } from "../../_shared/db";

const SEQUENCE = "lav_variant_identifier_seq";

/** Reserves `count` identifier numbers in one round trip. */
async function nextSequenceValues(db: Tx | typeof prisma, count: number): Promise<number[]> {
  if (count <= 0) return [];
  const rows = await db.$queryRawUnsafe<{ value: bigint }[]>(
    `SELECT nextval('${SEQUENCE}') AS value FROM generate_series(1, $1)`,
    count,
  );
  return rows.map((row) => Number(row.value));
}

/** `gold-plated-ring` -> `GOLDPLAT`. Falls back to ITEM for slugs with no letters. */
function slugFragment(slug: string): string {
  const cleaned = slug.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 8);
  return cleaned || "ITEM";
}

export function formatSku(productSlug: string, sequence: number): string {
  return `LAV-${slugFragment(productSlug)}-${String(sequence).padStart(5, "0")}`;
}

export function formatBarcode(sequence: number): string {
  return `LAV${String(sequence).padStart(10, "0")}`;
}

/**
 * Allocates SKU and barcode pairs for variants that are missing them.
 * Takes the whole batch at once: creating a product with five variants
 * should cost one sequence round trip, not five.
 */
export async function allocateIdentifiers(
  db: Tx | typeof prisma,
  requests: readonly { productSlug: string; needsSku: boolean; needsBarcode: boolean }[],
): Promise<{ sku: string | null; barcode: string | null }[]> {
  const needed = requests.reduce(
    (total, r) => total + (r.needsSku ? 1 : 0) + (r.needsBarcode ? 1 : 0),
    0,
  );
  const values = await nextSequenceValues(db, needed);
  let cursor = 0;

  return requests.map((request) => ({
    sku: request.needsSku ? formatSku(request.productSlug, values[cursor++]) : null,
    barcode: request.needsBarcode ? formatBarcode(values[cursor++]) : null,
  }));
}
