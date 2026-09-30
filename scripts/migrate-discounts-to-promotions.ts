/**
 * Carries every existing coupon (Discount) over into a Promotion, so codes
 * clients already hold keep working once checkout prices through the
 * promotion engine.
 *
 * Idempotent, keyed on the code: a coupon whose code is already a promotion
 * code is skipped, so the script is safe to run again. The Discount rows are
 * left untouched as read-only history.
 *
 *   npx tsx scripts/migrate-discounts-to-promotions.ts          (dry run)
 *   npx tsx scripts/migrate-discounts-to-promotions.ts --apply
 */
import "./load-env";
import { prisma } from "../src/lib/prisma";
import { benefitSchema } from "../src/modules/promotions/schema";

const apply = process.argv.includes("--apply");

async function main() {
  const target = new URL(process.env.DATABASE_URL ?? "postgres://unknown");
  console.log(`Target: ${target.hostname}${target.pathname} · ${apply ? "APPLY" : "dry run"}\n`);

  const [discounts, existing] = await Promise.all([
    prisma.discount.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.promotionCode.findMany({ select: { code: true } }),
  ]);
  const taken = new Set(existing.map((c) => c.code.toUpperCase()));

  let created = 0;
  for (const d of discounts) {
    const code = d.code.trim().toUpperCase();
    if (taken.has(code)) {
      console.log(`skip   ${code} — already a promotion`);
      continue;
    }

    const benefit = benefitSchema.parse(
      d.discountType === "PERCENTAGE"
        ? { type: "percentOffOrder", bps: Math.min(10_000, Math.max(1, d.discountValue * 100)) }
        : { type: "amountOffOrder", cents: Math.max(1, d.discountValue) },
    );

    console.log(`create ${code} — ${d.title}`);
    if (!apply) continue;

    await prisma.promotion.create({
      data: {
        name: d.title,
        description: d.description ? `Carried over from the coupon list. ${d.description}` : "Carried over from the coupon list.",
        template: "COUPON",
        trigger: "CODE",
        channels: ["ONLINE", "STORE"],
        benefit,
        minSubtotalCents: d.minPurchase && d.minPurchase > 0 ? d.minPurchase : null,
        maxDiscountCents: d.discountType === "PERCENTAGE" && d.maxDiscount ? d.maxDiscount : null,
        usageLimit: d.usageLimit,
        usedCount: d.usedCount,
        startsAt: d.startDate,
        endsAt: d.endDate,
        isRecurring: d.isRecurring,
        recurrenceType: d.recurrenceType,
        recurrenceDaysOfWeek: d.recurrenceDaysOfWeek,
        recurrenceDayOfMonth: d.recurrenceDayOfMonth,
        recurrenceStartTime: d.recurrenceStartTime,
        recurrenceEndTime: d.recurrenceEndTime,
        // A coupon that was switched off stays off, but keeps its history.
        activatedAt: d.createdAt,
        isPaused: !d.isActive,
        title: d.title,
        terms: d.description,
        showOnStorefront: d.isActive,
        codes: { create: { code } },
      },
    });
    created += 1;
  }

  console.log(`\n${apply ? "Created" : "Would create"} ${apply ? created : discounts.length - taken.size} promotion(s).`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
