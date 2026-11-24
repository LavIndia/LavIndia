/**
 * Seeds the GST master tables with CANDIDATE entries from the Phase 2 research.
 *
 *     npx tsx scripts/seed-gst-candidates.ts
 *
 * Local database only. Writes gst_* tables and nothing else. Safe to re-run.
 *
 * What it does NOT do:
 *   - approve any rate (every rate is DRAFT, with no approver),
 *   - map any rate to any LavIndia product,
 *   - invent a GSTIN, a state, or a classification.
 *
 * The entries are those read in Notification 9/2025-Integrated Tax (Rate), as
 * corrected on 18-9-2025 — a copy printed from the ICAI site, not the gazette.
 * The notifications are recorded with no verifier: someone compares them with
 * the gazette and fills that in. Their descriptions are quoted verbatim.
 */
import "./load-env";
import { assertLocalDatabase } from "../prisma/guard-destructive";
import { prisma } from "../src/lib/prisma";

const IGST_URL = "https://courier.cbic.gov.in/ECCS/advisory/2025/NOTIFICATION%20NO.%209_2025-INTEGRATED%20TAX%20(RATE)%20-1759486719.pdf";
const FROM = new Date("2025-09-22T00:00:00.000Z");

const NOTIFICATIONS = [
  { number: "9/2025-Integrated Tax (Rate)", issuedOn: "2025-09-17", effectiveFrom: "2025-09-22", title: "Rates of integrated tax on supplies of goods (supersedes 01/2017-Integrated Tax (Rate)); corrected by G.S.R. 677(E) of 18-9-2025", sourceUrl: IGST_URL,
    notes: "READ, but the copy is printed from the ICAI site and hosted on CBIC's courier site; it is not the gazette original. The effective date is from PIB's FAQ on the 56th GST Council decisions, not from the copy read. Verification against the gazette is pending." },
  { number: "9/2025-Central Tax (Rate)", issuedOn: "2025-09-17", effectiveFrom: "2025-09-22", title: "Rates of central tax on intra-State supplies of goods (G.S.R. 641(E))", sourceUrl: null,
    notes: "NOT READ. Twin of the Integrated Tax notification above; it is what states the CGST rate. The CGST/SGST split used in the draft rates is half of the IGST rate and has not been checked against this text." },
  { number: "13/2025-Central Tax (Rate)", issuedOn: "2025-09-17", effectiveFrom: "2025-09-22", title: "Handicrafts, including handmade imitation jewellery of heading 7117 (S.No. 27, 1.5%)", sourceUrl: "https://statetax.goa.gov.in/PDF/state_notif/Rate/13_(13_2025)_2025(rate).pdf",
    notes: "The Goa State Tax twin was read (1.5% is the state half; the total with the central half is 3%). The Central Tax text was not read. 'Handmade' is not defined in the text read." },
  { number: "01/2026-Central Tax (Rate)", issuedOn: "2026-04-30", effectiveFrom: "2026-05-01", title: "Amends 9/2025-Central Tax (Rate), G.S.R. 328(E)", sourceUrl: null,
    notes: "CONTENT NOT READ. Its existence and date are recorded in the footer of 02/2026. Secondary sources say it aligns entries with the Finance Act 2026. It must be read before any rate is approved." },
  { number: "02/2026-Central Tax (Rate)", issuedOn: "2026-10-27", effectiveFrom: "2026-11-01", title: "Further amends 9/2025-Central Tax (Rate): fertiliser and tyre entries only", sourceUrl: "https://www.caalley.com/gst26/cgst-rate-notification-02.pdf",
    notes: "READ (a private-site copy of the CBIC text). It does not touch Chapter 71 or Chapter 91. Its footer states 9/2025 was last amended by 01/2026." },
];

const HSN = [
  { code: "7113", description: "Articles of jewellery and parts thereof, of precious metal or of metal clad with precious metal" },
  { code: "7116", description: "Articles of natural or cultured pearls, precious or semi-precious stones (natural, synthetic or reconstructed)" },
  { code: "7117", description: "Imitation jewellery [other than bangles of lac/shellac]" },
  { code: "9101", description: "Wrist-watches, pocket-watches and other watches, including stopwatches, with case of precious metal or of metal clad with precious metal" },
  { code: "9102", description: "Wrist-watches, pocket-watches and other watches, including stop watches, other than those of heading 9101" },
];

// code -> [description of where it was read, total bps]
const RATES: Array<{ code: string; rateBps: number; where: string }> = [
  { code: "7113", rateBps: 300, where: "Schedule IV (IGST 3%), S.No. 10" },
  { code: "7116", rateBps: 300, where: "Schedule IV (IGST 3%), S.No. 13" },
  { code: "7117", rateBps: 300, where: "Schedule IV (IGST 3%), S.No. 14" },
  { code: "9101", rateBps: 1800, where: "Schedule II (IGST 18%), serial number unreadable in the extracted text" },
  { code: "9102", rateBps: 1800, where: "Schedule II (IGST 18%), serial number unreadable in the extracted text" },
];

const PENDING = [
  { kind: "PRODUCT" as const, name: "Earing pearl", categoryName: "Earrings", note: "Seen on the live shop at INR 99 (compare-at 199); not in the local catalog" },
  { kind: "PRODUCT" as const, name: "Golden Feather Wings Statement Earrings", categoryName: "Earrings", note: "Seen on the live shop at INR 699 (compare-at 899); not in the local catalog" },
  { kind: "PRODUCT" as const, name: "Gold Crystal Wing Statement Earrings", categoryName: "Earrings", note: "Seen on the live shop at INR 1,049 (compare-at 1,299); not in the local catalog" },
  { kind: "CATEGORY" as const, name: "Bracelet", categoryName: null, note: "A category on the live shop's menu; its products are not known here" },
  { kind: "CATEGORY" as const, name: "Watch", categoryName: null, note: "A category on the live shop's menu; its products are not known here. Watches fall under 9101/9102 and need case and strap details" },
];

async function main(): Promise<void> {
  assertLocalDatabase("scripts/seed-gst-candidates.ts");

  if (!(await prisma.gstConfiguration.findFirst())) await prisma.gstConfiguration.create({ data: {} });
  if (!(await prisma.gstBusinessProfile.findFirst())) await prisma.gstBusinessProfile.create({ data: {} });

  const notifications = new Map<string, string>();
  for (const n of NOTIFICATIONS) {
    const issuedOn = new Date(`${n.issuedOn}T00:00:00.000Z`);
    const row = await prisma.gstNotification.upsert({
      where: { number_issuedOn: { number: n.number, issuedOn } },
      create: { number: n.number, issuedOn, effectiveFrom: new Date(`${n.effectiveFrom}T00:00:00.000Z`), title: n.title, sourceUrl: n.sourceUrl, notes: n.notes },
      update: {},
    });
    notifications.set(n.number, row.id);
  }

  const hsnIds = new Map<string, string>();
  for (const h of HSN) {
    const row = await prisma.gstHsnMaster.upsert({ where: { code: h.code }, create: h, update: {} });
    hsnIds.set(h.code, row.id);
  }

  let created = 0;
  for (const r of RATES) {
    const hsnId = hsnIds.get(r.code)!;
    if (await prisma.gstRateMaster.findFirst({ where: { hsnId, effectiveFrom: FROM } })) continue;
    await prisma.gstRateMaster.create({
      data: {
        hsnId,
        rateBps: r.rateBps, cgstBps: r.rateBps / 2, sgstBps: r.rateBps / 2, igstBps: r.rateBps, cessBps: 0,
        effectiveFrom: FROM,
        notificationId: notifications.get("9/2025-Integrated Tax (Rate)"),
        approval: "DRAFT",
        notes: `CANDIDATE, not approved. ${r.where}, Notification 9/2025-Integrated Tax (Rate) as corrected 18-9-2025. CGST/SGST are half the IGST rate and are not yet checked against the Central Tax text. 01/2026 (30-4-2026) has not been read.`,
      },
    });
    created++;
  }

  for (const p of PENDING) {
    await prisma.gstPendingCatalogItem.upsert({
      where: { kind_name: { kind: p.kind, name: p.name } },
      create: { ...p, source: "Seen on the live site during testing (Phase 2); not read from production" },
      update: {},
    });
  }

  const [rates, approved, mappings] = await Promise.all([
    prisma.gstRateMaster.count(),
    prisma.gstRateMaster.count({ where: { approval: "APPROVED" } }),
    prisma.gstProductMapping.count(),
  ]);
  console.log(`notifications ${notifications.size}, HSN ${hsnIds.size}, rates ${rates} (${created} new, ${approved} approved), pending catalog items ${PENDING.length}, product mappings ${mappings}`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
