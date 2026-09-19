/**
 * Inventory locations.
 *
 * The architecture is multi-location from day one — there simply happens to
 * be one location ("Main Stock") today. Nothing outside this file may assume
 * that, which is why callers ask for the default location rather than
 * hardcoding it.
 */
import { prisma } from "../../_shared/db";
import { DomainError } from "../../_shared/errors";
import { LocationId, type LocationId as LocationIdType } from "../../_shared/ids";
import type { InventoryLocationDto } from "../contracts";

export async function listLocations(
  options: { activeOnly?: boolean } = {},
): Promise<InventoryLocationDto[]> {
  const rows = await prisma.inventoryLocation.findMany({
    where: options.activeOnly === false ? {} : { isActive: true },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    select: { id: true, name: true, code: true, isActive: true, isDefault: true },
  });

  return rows.map((row) => ({
    locationId: LocationId(row.id),
    name: row.name,
    code: row.code,
    isActive: row.isActive,
    isDefault: row.isDefault,
  }));
}

/**
 * Resolves the default location, memoised for the lifetime of the server
 * process. It is created by migration and effectively never changes, so
 * re-resolving it on every stock read would be a wasted round trip on the
 * hottest path in the application.
 */
export class DefaultLocationResolver {
  private cache: Promise<LocationIdType> | null = null;

  async resolve(): Promise<LocationIdType> {
    this.cache ??= this.load();
    try {
      return await this.cache;
    } catch (error) {
      // Never cache a failure — the location may be created moments later.
      this.cache = null;
      throw error;
    }
  }

  /** Clears the memo, for tests and for after a location is reconfigured. */
  invalidate(): void {
    this.cache = null;
  }

  private async load(): Promise<LocationIdType> {
    const location =
      (await prisma.inventoryLocation.findFirst({
        where: { isDefault: true, isActive: true },
        select: { id: true },
      })) ??
      // Falls back to the oldest active location, so a database where nobody
      // has flagged a default still works rather than failing every sale.
      (await prisma.inventoryLocation.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      }));

    if (!location) {
      throw new DomainError("LOCATION_NOT_FOUND", "No inventory location has been set up yet");
    }
    return LocationId(location.id);
  }
}
