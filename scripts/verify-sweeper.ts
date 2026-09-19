/** Runs the reservation sweeper against local data and reports what it did. */
import "./load-env";
import { inventoryService } from "../src/modules/inventory";
import { prisma } from "../src/lib/prisma";

async function main() {
  const now = new Date();
  const [active, expired] = await Promise.all([
    prisma.inventoryReservation.count({ where: { status: "HELD" } }),
    prisma.inventoryReservation.count({
      where: { status: "HELD", expiresAt: { lt: now } },
    }),
  ]);
  console.log(`active holds: ${active}, of which expired: ${expired}`);

  const released = await inventoryService.releaseExpiredReservations(200);
  console.log(`sweeper released: ${released}`);

  const stillExpired = await prisma.inventoryReservation.count({
    where: { status: "HELD", expiresAt: { lt: new Date() } },
  });
  console.log(`expired holds remaining after sweep: ${stillExpired}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
