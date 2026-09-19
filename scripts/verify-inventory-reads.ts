/**
 * Exercises the Inventory read models against a real database.
 *
 * These are hand-written SQL rather than Prisma queries, so a typo in a
 * column name is invisible to the type checker and only shows up at runtime.
 * This runs every branch — each filter, each status, paging — so that never
 * happens on a screen in front of the owner.
 *
 *     npx tsx scripts/verify-inventory-reads.ts
 */
import { prisma } from "../src/lib/prisma";
// Must come first: populates process.env before anything reads it.
import "./load-env";
import { assertLocalDatabase } from "../prisma/guard-destructive";
import { VariantId } from "../src/modules/_shared/ids";
import {
  queryStock,
  queryStockSummary,
  queryMovements,
  inventoryService,
} from "../src/modules/inventory";

let passed = 0;
let failed = 0;

function check(label: string, ok: boolean, detail?: unknown): void {
  if (ok) {
    passed++;
    console.log(`  PASS  ${label}`);
  } else {
    failed++;
    console.log(`  FAIL  ${label}${detail === undefined ? "" : `  (${JSON.stringify(detail)})`}`);
  }
}

async function main(): Promise<void> {
  assertLocalDatabase("scripts/verify-inventory-reads.ts");

  const locations = await inventoryService.listLocations();
  const locationId = locations[0]?.locationId;
  console.log(`\nLocations: ${locations.map((l) => l.name).join(", ") || "none"}\n`);

  console.log("Stock read model");
  const all = await queryStock({});
  check("unfiltered query runs and returns rows", all.rows.length > 0, all.totalCount);
  check("total count is populated", all.totalCount > 0, all.totalCount);
  check("rows carry a resolved product name", Boolean(all.rows[0]?.productName));
  check("rows carry a price", (all.rows[0]?.priceCents ?? 0) > 0);
  check(
    "available equals quantity minus reserved",
    all.rows.every((r) => r.available === r.quantity - r.reservedQuantity),
  );
  check(
    "page size is respected",
    all.rows.length <= all.pageSize,
    { rows: all.rows.length, pageSize: all.pageSize },
  );

  for (const status of ["IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK"] as const) {
    const filtered = await queryStock({ status });
    check(
      `status filter ${status} returns only that status`,
      filtered.rows.every((r) => r.status === status),
      filtered.rows.slice(0, 2).map((r) => r.status),
    );
  }

  const byLocation = await queryStock({ locationId });
  check("location filter runs", byLocation.rows.every((r) => r.locationId === locationId));

  // An exact barcode must land on exactly one row — this is what a scan does.
  const sample = all.rows.find((r) => r.barcode);
  if (sample?.barcode) {
    const scanned = await queryStock({ search: sample.barcode });
    check("an exact barcode search returns one row", scanned.rows.length === 1, scanned.rows.length);
    check(
      "the scanned row is the right one",
      scanned.rows[0]?.variantId === sample.variantId,
    );
  }

  const byName = await queryStock({ search: all.rows[0].productName.slice(0, 5) });
  check("partial name search returns rows", byName.rows.length > 0, byName.totalCount);

  const pageTwo = await queryStock({ page: 2, pageSize: 5 });
  check("paging runs and reports the same total", pageTwo.totalCount === all.totalCount, {
    pageTwo: pageTwo.totalCount,
    all: all.totalCount,
  });
  check("page two is a different slice", pageTwo.rows[0]?.variantId !== all.rows[0]?.variantId);

  const empty = await queryStock({ search: "zzz-no-such-product-zzz" });
  check("a search with no matches returns an empty page", empty.rows.length === 0 && empty.totalCount === 0);

  console.log("\nStock summary");
  const summary = await queryStockSummary();
  check("summary runs", typeof summary.totalUnits === "number", summary);
  check(
    "summary buckets add up to the row count",
    summary.inStock + summary.lowStock + summary.outOfStock === all.totalCount,
    { summary, totalCount: all.totalCount },
  );
  const scopedSummary = await queryStockSummary(locationId);
  check("summary accepts a location", typeof scopedSummary.totalUnits === "number");

  console.log("\nMovement read model");
  const movements = await queryMovements({});
  check("unfiltered movements query runs", movements.rows.length > 0, movements.totalCount);
  check("movements carry a resolved product name", Boolean(movements.rows[0]?.productName));
  check("movements carry a location name", Boolean(movements.rows[0]?.locationName));
  check(
    "movements are newest first",
    movements.rows.every(
      (row, i) => i === 0 || row.createdAt <= movements.rows[i - 1].createdAt,
    ),
  );

  const byType = await queryMovements({ type: "RECEIVE" });
  check("type filter runs", byType.rows.every((r) => r.type === "RECEIVE"), byType.totalCount);

  const byVariant = await queryMovements({ variantId: VariantId(all.rows[0].variantId) });
  check("variant filter runs", byVariant.rows.every((r) => r.productName === all.rows[0].productName));

  const movementSearch = await queryMovements({ search: sample?.barcode ?? "LAV" });
  check("movement search runs", Array.isArray(movementSearch.rows), movementSearch.totalCount);

  const movementsPaged = await queryMovements({ page: 1, pageSize: 3 });
  check("movement paging respects page size", movementsPaged.rows.length <= 3);

  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error("\nRead-model verification aborted:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
