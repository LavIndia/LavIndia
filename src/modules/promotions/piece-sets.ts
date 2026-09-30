/**
 * Piece Sets: named, reusable selections of pieces that offers point at.
 *
 * An offer stores only the ids of its sets. Before the engine runs, the ids
 * are resolved against the current library, so editing a set changes every
 * offer that uses it — exactly what "Festive earrings" should mean.
 *
 * Besides the sets the admin saves, every category and every collection is
 * a set without anyone creating it, and so is "All pieces".
 */
import type { PieceSet } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../_shared/db";
import { DomainError } from "../_shared/errors";
import type { Benefit, EnginePromotion, PieceFilter, PieceRule, ResolvedPieceSet } from "./contracts";
import { pieceRuleSchema, pieceSetInputSchema } from "./schema";

export const ALL_PIECES_ID = "all";
export const categorySetId = (id: string) => `category:${id}`;
export const collectionSetId = (id: string) => `collection:${id}`;
export const isBuiltInSet = (id: string) =>
  id === ALL_PIECES_ID || id.startsWith("category:") || id.startsWith("collection:");

export type SetLibrary = Map<string, ResolvedPieceSet>;

export interface SetLibrarySource {
  stored: PieceSet[];
  categories: Array<{ id: string; name: string }>;
  collections: Array<{ id: string; name: string }>;
}

function storedToResolved(row: PieceSet): ResolvedPieceSet {
  const rules = z.array(pieceRuleSchema).safeParse(row.rules);
  return {
    id: row.id,
    name: row.name,
    match: row.match === "ANY" ? "ANY" : "ALL",
    rules: rules.success ? (rules.data as PieceRule[]) : [],
    includeProductIds: row.includeProductIds,
    excludeProductIds: row.excludeProductIds,
  };
}

export function buildSetLibrary(source: SetLibrarySource): SetLibrary {
  const library: SetLibrary = new Map();
  library.set(ALL_PIECES_ID, {
    id: ALL_PIECES_ID,
    name: "All pieces",
    match: "ALL",
    rules: [{ field: "price", op: "over", minCents: 0 }],
    includeProductIds: [],
    excludeProductIds: [],
  });
  for (const c of source.categories) {
    library.set(categorySetId(c.id), {
      id: categorySetId(c.id),
      name: c.name,
      match: "ALL",
      rules: [{ field: "category", op: "is", values: [c.id] }],
      includeProductIds: [],
      excludeProductIds: [],
    });
  }
  for (const c of source.collections) {
    library.set(collectionSetId(c.id), {
      id: collectionSetId(c.id),
      name: c.name,
      match: "ALL",
      rules: [{ field: "collection", op: "is", values: [c.id] }],
      includeProductIds: [],
      excludeProductIds: [],
    });
  }
  for (const row of source.stored) {
    if (!row.archivedAt) library.set(row.id, storedToResolved(row));
  }
  return library;
}

export function resolvePieces(filter: PieceFilter, library: SetLibrary): PieceFilter {
  if (!filter.setIds?.length) return filter;
  return {
    ...filter,
    sets: filter.setIds.map((id) => library.get(id)).filter((s): s is ResolvedPieceSet => Boolean(s)),
  };
}

function resolveBenefit(benefit: Benefit, library: SetLibrary): Benefit {
  if (benefit.type === "reward" && benefit.gets) {
    return { ...benefit, gets: resolvePieces(benefit.gets, library) };
  }
  if (benefit.type === "bundle") {
    return {
      ...benefit,
      components: benefit.components.map((c) => ({ ...c, pieces: resolvePieces(c.pieces, library) })),
    };
  }
  return benefit;
}

/** Fills in the sets an offer refers to, from the current library. */
export function resolvePromotion(promotion: EnginePromotion, library: SetLibrary): EnginePromotion {
  return {
    ...promotion,
    pieces: resolvePieces(promotion.pieces, library),
    benefit: resolveBenefit(promotion.benefit, library),
  };
}

/** Every set id an offer's mechanics mention, wherever they appear. */
export function setIdsOf(pieces: unknown, benefit: unknown): string[] {
  const ids = new Set<string>();
  const collect = (value: unknown) => {
    const list = (value as { setIds?: unknown } | null)?.setIds;
    if (Array.isArray(list)) list.forEach((id) => typeof id === "string" && ids.add(id));
  };
  collect(pieces);
  const b = benefit as { type?: string; gets?: unknown; components?: Array<{ pieces?: unknown }> } | null;
  if (b?.type === "reward") collect(b.gets);
  if (b?.type === "bundle") b.components?.forEach((c) => collect(c.pieces));
  return [...ids];
}

// --- Admin actions ---------------------------------------------------------

export async function loadSetLibrarySource(): Promise<SetLibrarySource> {
  const [stored, categories, collections] = await Promise.all([
    prisma.pieceSet.findMany({ orderBy: { name: "asc" } }),
    prisma.category.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.collection.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  return { stored, categories, collections };
}

/** Offers (not archived) that use each set, for "used by 2 live offers". */
export async function setUsage(): Promise<Map<string, Array<{ id: string; name: string; live: boolean }>>> {
  const offers = await prisma.promotion.findMany({
    where: { archivedAt: null },
    select: { id: true, name: true, pieces: true, benefit: true, activatedAt: true, isPaused: true, endsAt: true },
  });
  const usage = new Map<string, Array<{ id: string; name: string; live: boolean }>>();
  const now = new Date();
  for (const offer of offers) {
    const live = Boolean(offer.activatedAt) && !offer.isPaused && (!offer.endsAt || offer.endsAt > now);
    for (const id of setIdsOf(offer.pieces, offer.benefit)) {
      const list = usage.get(id) ?? [];
      list.push({ id: offer.id, name: offer.name, live });
      usage.set(id, list);
    }
  }
  return usage;
}

export async function createPieceSet(raw: unknown): Promise<PieceSet> {
  const input = pieceSetInputSchema.parse(raw);
  return prisma.pieceSet.create({ data: { ...input, rules: input.rules } });
}

export async function updatePieceSet(id: string, raw: unknown): Promise<PieceSet> {
  const input = pieceSetInputSchema.parse(raw);
  return prisma.pieceSet.update({ where: { id }, data: { ...input, rules: input.rules } });
}

/**
 * A set used by any offer that is not archived cannot be deleted — the
 * offer would quietly stop matching anything. It can be archived once
 * those offers no longer use it.
 */
export async function deletePieceSet(id: string): Promise<void> {
  const users = (await setUsage()).get(id) ?? [];
  if (users.length) {
    throw new DomainError(
      "CONFLICT",
      `Used by ${users.map((u) => `“${u.name}”`).join(", ")} — change ${users.length === 1 ? "that offer" : "those offers"} first`,
    );
  }
  await prisma.pieceSet.delete({ where: { id } });
}
