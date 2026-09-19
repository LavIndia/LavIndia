/**
 * Sanity check for RFM against whatever the local database holds.
 *
 * Prints the segment table and a few customers so the scoring can be judged
 * against real figures rather than assumed correct.
 */
import "./load-env";
import { loadRfmFacts, buildRfmBoard, segmentLabel } from "../src/modules/customers/rfm";

const rupees = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN")}`;

async function main() {
  const facts = await loadRfmFacts();
  console.log(`customers with orders: ${facts.length}`);

  const board = buildRfmBoard(facts);
  console.log(`scored: ${board.totalCustomers}, revenue: ${rupees(board.totalRevenueCents)}\n`);

  for (const s of board.segments) {
    const label = segmentLabel(s.segment);
    console.log(
      `${label.name.padEnd(20)} ${String(s.customers).padStart(4)} customers  ` +
        `${rupees(s.revenueCents).padStart(14)}  ${(s.revenueShare * 100).toFixed(1)}%`,
    );
  }

  console.log("\ntop customers:");
  for (const c of board.customers.slice(0, 5)) {
    console.log(
      `  ${(c.name ?? c.customerKey).padEnd(24)} R${c.recency} F${c.frequency} M${c.monetary}  ` +
        `${c.orderCount} orders  ${rupees(c.totalSpendCents)}  ${c.recencyDays}d ago  [${c.channels.join("+")}]`,
    );
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
