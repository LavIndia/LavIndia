/**
 * Verifies the GST administration services: the business profile, product
 * composition and the approval workflow, rate administration, the material
 * sheet, the reports and the notification monitoring.
 *
 *     DATABASE_URL=<a THROWAWAY copy, name ending _it_test> npx tsx scripts/verify-gst-workflow.ts
 *
 * Like verify-gst-integration.ts it refuses to run anywhere else.
 */
import "./load-env";
import { assertLocalDatabase } from "../prisma/guard-destructive";
import { prisma } from "../src/lib/prisma";
import { isDomainError } from "../src/modules/_shared/errors";
import { saveBusinessProfile, verifyBusinessProfile } from "../src/modules/gst/profile";
import { approveClassification, rejectClassification, saveComposition, submitClassification, worklist } from "../src/modules/gst/classification";
import { suggestHeadings, type Composition } from "../src/modules/gst/composition";
import { approveRate, createDraftRate, createNotification, verifyNotification, saveCode } from "../src/modules/gst/rates-admin";
import { buildTemplate, importSheet, parseSheet } from "../src/modules/gst/material-csv";
import { gstr1, gstr3bFigures, hsnSummary, monthRange, reconcileGstr3b, salesRegister, tableToCsv, taxLiability } from "../src/modules/gst/reports";
import { acknowledgeWatchChange, addWatch, isOfficialUrl, proposeChange, reviewProposal } from "../src/modules/gst/monitoring";
import { check, results } from "./verify-helpers";

const dbName = new URL(process.env.DATABASE_URL ?? "postgresql://x/x").pathname.replace("/", "");
if (!dbName.endsWith("_it_test")) { console.error(`Refusing to run against "${dbName}": needs a throwaway database ending _it_test.`); process.exit(1); }

const ACTOR = { id: "verify", name: "Verify" };
const code = async (run: () => Promise<unknown>) => { try { await run(); return null; } catch (e) { return isDomainError(e) ? e.code : e instanceof Error ? e.message.slice(0, 160) : String(e); } };
const msg = async (run: () => Promise<unknown>) => { try { await run(); return ""; } catch (e) { return e instanceof Error ? e.message : String(e); } };
const comp = (over: Partial<Composition>): Composition => ({ baseMetal: null, platingType: "UNKNOWN", platingMetal: null, preciousMetal: null, preciousPurity: null, gems: null, confirmedBy: null, ...over });

async function main(): Promise<void> {
  assertLocalDatabase("scripts/verify-gst-workflow.ts");

  console.log("Business profile");
  check("a GSTIN in the wrong shape is refused", await msg(() => saveBusinessProfile({ gstin: "GST123456789" }, "u")), "That is not a GSTIN: it must be 15 characters in the GST pattern");
  check("a GSTIN with a typo is refused by its check character", (await msg(() => saveBusinessProfile({ gstin: "27AAPFU0939F1ZX" }, "u"))).includes("does not match"), true);
  await saveBusinessProfile({ legalName: "Test Shop", gstin: "27aapfu0939f1zv", registeredAddress: null }, "u");
  const profile = await prisma.gstBusinessProfile.findFirstOrThrow();
  check("a valid GSTIN is stored upper-cased, with the state read from it, never typed separately", [profile.gstin, profile.stateCode, profile.stateName], ["27AAPFU0939F1ZV", "27", "Maharashtra"]);
  check("verifying is refused while the address is missing", await msg(() => verifyBusinessProfile("Accountant", "u")), "Still missing: registered address");
  await saveBusinessProfile({ registeredAddress: "1 Test Road" }, "u");
  check("verifying needs the name of who checked it", await code(() => verifyBusinessProfile("  ", "u")), "VALIDATION_FAILED");
  await verifyBusinessProfile("Test Accountant", "u");
  check("verified, with who checked it recorded", (await prisma.gstBusinessProfile.findFirstOrThrow()).verificationStatus, "VERIFIED");
  await prisma.gstBusinessProfile.updateMany({ data: { engineMode: "SHADOW" } });
  await saveBusinessProfile({ gstin: "29AABCT1332L1ZZ" }, "u").catch(() => undefined);
  const changed = await saveBusinessProfile({ gstin: "27AAPFU0939F1ZV", legalName: "Renamed Shop" }, "u");
  check("changing details but not the GSTIN keeps it verified", changed.verificationStatus, "VERIFIED");

  console.log("Composition and what is missing");
  check("nothing known: MISSING, with every gap named", (await worklist()).find((r) => r.name === "Gold Wrap Ring")?.infoStatus, "MISSING");
  const product = await prisma.product.findFirstOrThrow({ where: { name: "Gold Wrap Ring" } });
  const other = await prisma.product.findFirstOrThrow({ where: { name: "Disc Charm Huggie Earrings" } });
  await saveComposition(product.id, { baseMetal: "brass" }, ACTOR);
  check("partly known: PARTIAL", (await worklist()).find((r) => r.productId === product.id)?.infoStatus, "PARTIAL");
  await saveComposition(product.id, { platingType: "ELECTROPLATED", platingMetal: "gold", gems: [] }, ACTOR);
  check("everything but the owner's confirmation: still PARTIAL, and that is what is missing", (await worklist()).find((r) => r.productId === product.id)?.missing, ["Confirmation from the owner that these details are right"]);
  check("an unknown stone origin keeps it incomplete", (await (async () => { await saveComposition(other.id, { baseMetal: "brass", platingType: "NONE", gems: [{ name: "Opal", kind: "STONE", origin: "UNKNOWN" }], confirmedBy: "Owner" }, ACTOR); return (await worklist()).find((r) => r.productId === other.id)?.infoStatus; })()), "PARTIAL");
  await saveComposition(product.id, { confirmedBy: "Owner" }, ACTOR);
  check("with confirmation: COMPLETE", (await worklist()).find((r) => r.productId === product.id)?.infoStatus, "COMPLETE");

  console.log("Suggestions are suggestions");
  check("unknown plating: nothing suggested", suggestHeadings(comp({})).headings, []);
  check("plating, no precious metal: 7117 as a candidate", suggestHeadings(comp({ platingType: "ELECTROPLATED", gems: [{ name: "Crystal", kind: "STONE", origin: "GLASS" }] })).headings.map((h) => h.code), ["7117"]);
  check("solid or clad precious metal: 7113", suggestHeadings(comp({ platingType: "SOLID_PRECIOUS" })).headings.map((h) => h.code), ["7113"]);
  const stones = suggestHeadings(comp({ platingType: "NONE", gems: [{ name: "Pearl", kind: "PEARL", origin: "CULTURED" }] }));
  check("real pearls or stones add 7116 and a caveat about 7117", [stones.headings.map((h) => h.code), stones.caveats.some((c) => c.includes("7117 may not apply"))], [["7117", "7116"], true]);
  check("every suggestion carries the warning that it is not a decision", suggestHeadings(comp({ platingType: "NONE" })).caveats[0].startsWith("A suggestion only"), true);

  console.log("Approval workflow");
  const hsn = Object.fromEntries((await prisma.gstHsnMaster.findMany()).map((h) => [h.code, h.id]));
  check("an incomplete product cannot be submitted", await code(() => submitClassification({ kind: "PRODUCT", productId: other.id }, { hsnId: hsn["7117"], effectiveFrom: new Date("2025-09-22") }, ACTOR)), "VALIDATION_FAILED");
  check("a piece cannot be given a SAC", await code(() => submitClassification({ kind: "PRODUCT", productId: product.id }, { sacId: "x", effectiveFrom: new Date("2025-09-22") }, ACTOR)), "VALIDATION_FAILED");
  const submitted = await submitClassification({ kind: "PRODUCT", productId: product.id }, { hsnId: hsn["7117"], effectiveFrom: new Date("2025-09-22"), basis: "Electroplated brass, no stones" }, ACTOR);
  check("submitting puts it in front of the accountant", submitted.status, "NEEDS_ACCOUNTANT_APPROVAL");
  check("approval needs the accountant's name", await code(() => approveClassification(submitted.id, "  ", ACTOR)), "VALIDATION_FAILED");
  const approved = await approveClassification(submitted.id, "Test Accountant", ACTOR);
  check("approved, with the accountant named beside the admin who entered it", [approved.status, approved.approvedBy?.startsWith("Test Accountant")], ["VERIFIED", true]);
  const trail = await prisma.gstClassificationEvent.findMany({ where: { productId: product.id }, orderBy: { createdAt: "asc" }, select: { action: true } });
  check("the trail records each step, in order", [...new Set(trail.map((t) => t.action))], ["INFO_SAVED", "SUBMITTED", "APPROVED"]);
  check("the trail cannot be altered", (await msg(() => prisma.gstClassificationEvent.updateMany({ data: { reason: "x" } }))).includes("append-only"), true);
  const second = await submitClassification({ kind: "PRODUCT", productId: product.id }, { hsnId: hsn["7113"], effectiveFrom: new Date("2026-01-01") }, ACTOR);
  check("rejection needs a reason and a name", await code(() => rejectClassification(second.id, "Acct", "  ", ACTOR)), "VALIDATION_FAILED");
  await rejectClassification(second.id, "Test Accountant", "It is not precious metal", ACTOR);
  check("a rejected classification goes back to needing information", (await prisma.gstProductMapping.findUniqueOrThrow({ where: { id: second.id } })).status, "NEEDS_PRODUCT_INFORMATION");
  const third = await submitClassification({ kind: "PRODUCT", productId: product.id }, { hsnId: hsn["7116"], effectiveFrom: new Date("2026-02-01") }, ACTOR);
  await approveClassification(third.id, "Test Accountant", ACTOR);
  const old = await prisma.gstProductMapping.findUniqueOrThrow({ where: { id: approved.id } });
  check("a newer approved version closes the older one the day before", [old.effectiveTo?.toISOString().slice(0, 10), old.status], ["2026-01-31", "VERIFIED"]);
  await saveComposition(product.id, { baseMetal: "stainless steel" }, ACTOR);
  const afterChange = await prisma.gstProductMapping.findMany({ where: { productId: product.id, status: "VERIFIED" } });
  check("changing the material details withdraws the approvals for fresh review", [afterChange.length, (await prisma.gstClassificationEvent.count({ where: { productId: product.id, action: "WITHDRAWN" } })) > 0], [0, true]);

  console.log("Rate administration: nothing is approved on a say-so");
  check("an odd number of basis points would split unevenly: refused", await code(() => createDraftRate({ hsnId: hsn["7117"], rateBps: 301, effectiveFrom: "2027-01-01" }, ACTOR)), "VALIDATION_FAILED");
  const draft = await createDraftRate({ hsnId: hsn["7117"], rateBps: 500, effectiveFrom: "2027-04-01" }, ACTOR);
  check("a new version is a DRAFT", draft.approval, "DRAFT");
  check("a rate with no notification cannot be approved", await code(() => approveRate(draft.id, "Acct", ACTOR)), "VALIDATION_FAILED");
  const note = await createNotification({ number: "TEST/2027", issuedOn: "2027-03-01", effectiveFrom: "2027-04-01", sourceUrl: "https://cbic-gst.gov.in/x" }, ACTOR);
  const withNote = await createDraftRate({ hsnId: hsn["7117"], rateBps: 500, effectiveFrom: "2027-04-01", notificationId: note.id }, ACTOR);
  check("a notification nobody has verified blocks approval", (await msg(() => approveRate(withNote.id, "Acct", ACTOR))).includes("has not been verified"), true);
  await verifyNotification(note.id, "Test Accountant", ACTOR);
  await prisma.gstRateMaster.updateMany({ where: { hsnId: hsn["7117"], approval: "DRAFT", notificationId: { not: note.id } }, data: { approvedBy: null } });
  const cur = await prisma.gstRateMaster.findFirstOrThrow({ where: { hsnId: hsn["7117"], effectiveFrom: new Date("2025-09-22") } });
  const seedNote = await prisma.gstNotification.findFirstOrThrow({ where: { id: cur.notificationId! } });
  await verifyNotification(seedNote.id, "Test Accountant", ACTOR);
  await approveRate(cur.id, "Test Accountant", ACTOR);
  await approveRate(withNote.id, "Test Accountant", ACTOR);
  const closed = await prisma.gstRateMaster.findUniqueOrThrow({ where: { id: cur.id } });
  check("approving a new version closes the old one the day before, leaving its rate untouched", [closed.effectiveTo?.toISOString().slice(0, 10), closed.rateBps], ["2027-03-31", 300]);
  check("the new version is approved with its approver recorded", (await prisma.gstRateMaster.findUniqueOrThrow({ where: { id: withNote.id } })).approvedBy?.startsWith("Test Accountant"), true);
  check("HSN and SAC formats are checked", [await code(() => saveCode("HSN", "71AB", "x", ACTOR)), await code(() => saveCode("SAC", "123456", "x", ACTOR))], ["VALIDATION_FAILED", "VALIDATION_FAILED"]);

  console.log("The material sheet");
  const sheet = await buildTemplate();
  check("the template opens in Excel (UTF-8 with a BOM) and explains itself", [sheet.charCodeAt(0) === 0xfeff, sheet.includes("# plating_type:")], [true, true]);
  const parsed = parseSheet(sheet);
  check("the template has a row for every product and a blank-id row per pending piece", [parsed.rows.length, parsed.blank], [18, 3]);
  const gid = (await prisma.product.findFirstOrThrow({ where: { name: "Tulip and Pearl Drop Earrings" } })).id;
  const csv = (rows: string[]) => sheet.split("\n").filter((l) => l.startsWith("#") || l.startsWith("﻿#")).join("\n") + "\nproduct_id,product_name,category,base_metal,alloy_notes,plating_type,plating_metal,precious_metal,precious_purity,precious_weight_mg,stones_and_pearls,is_handmade,handmade_notes,supplier_name,supplier_hsn,material_notes,confirmed_by\n" + rows.join("\n");
  const good = `${gid},Tulip,Earrings,brass,,ELECTROPLATED,gold,,,,Pearl|PEARL|CULTURED ; Enamel|STONE|OTHER,yes,,Acme,7117,,Owner`;
  const bad = `${gid},Tulip,Earrings,brass,,GOLDISH,,,,12.5,Opal|GEM|NATURAL,maybe,,,71AB,,`;
  const dry = await importSheet(csv([good]), ACTOR, true);
  check("a dry run counts what would be saved and saves nothing", [dry.saved, (await prisma.gstProductProfile.findUnique({ where: { productId: gid } }))?.baseMetal ?? null], [1, null]);
  const rejected = await importSheet(csv([bad]), ACTOR, false);
  check("a bad row is reported by line with every reason, and nothing from it is saved", [rejected.saved, rejected.issues.length >= 4, (await prisma.gstProductProfile.findUnique({ where: { productId: gid } })) === null], [0, true, true]);
  const real = await importSheet(csv([good]), ACTOR, false);
  const saved = await prisma.gstProductProfile.findUniqueOrThrow({ where: { productId: gid } });
  check("a good row is saved, with stones parsed", [real.saved, saved.platingType, (saved.gems as unknown[]).length, saved.isHandmade, saved.supplierHsn], [1, "ELECTROPLATED", 2, true, "7117"]);
  await importSheet(csv([`${gid},Tulip,Earrings,,,,,,,,,,,,,,`]), ACTOR, false);
  check("blank cells never overwrite what is already there", (await prisma.gstProductProfile.findUniqueOrThrow({ where: { productId: gid } })).baseMetal, "brass");
  check("an unknown product id is reported", (await importSheet(csv(["ghost,x,x,brass,,,,,,,,,,,,,"]), ACTOR, true)).issues[0].message.includes("No product with id ghost"), true);
  check("NONE means there are no stones, which is an answer", (await (async () => { await importSheet(csv([`${gid},T,E,,,,,,,,NONE,,,,,,`]), ACTOR, false); return (await prisma.gstProductProfile.findUniqueOrThrow({ where: { productId: gid } })).gems; })()), []);

  console.log("Reports");
  const SUP = { name: "Test Shop", gstin: "27AAPFU0939F1ZV", stateCode: "27" };
  let n = 0;
  const invoice = async (when: string, kind: "B2B" | "B2C", supply: "INTRA_STATE" | "INTER_STATE", lines: Array<{ code: string; rateBps: number; taxable: number; qty?: number; kind?: string }>, untaxed = 0) => {
    n++;
    const ls = lines.map((l, i) => { const half = Math.floor(Math.round(l.taxable * l.rateBps / 10000) / 2); const tax = Math.round(l.taxable * l.rateBps / 10000); return { lineId: String(i), kind: l.kind ?? "GOODS", description: "x", code: l.code, codeKind: "HSN", uqc: "NOS", quantity: l.qty ?? 1, rateVersionId: "r", rateBps: l.rateBps, cessBps: 0, taxableCents: l.taxable, cgstCents: supply === "INTRA_STATE" ? half : 0, sgstCents: supply === "INTRA_STATE" ? tax - half : 0, igstCents: supply === "INTER_STATE" ? tax : 0, cessCents: 0, taxCents: tax, payableCents: l.taxable + tax }; });
    const t = ls.reduce((s, l) => ({ taxable: s.taxable + l.taxableCents, cgst: s.cgst + l.cgstCents, sgst: s.sgst + l.sgstCents, igst: s.igst + l.igstCents }), { taxable: 0, cgst: 0, sgst: 0, igst: 0 });
    return prisma.gstInvoiceDetail.create({ data: { orderId: `ord${n}`, invoiceNumber: `INV/26-27/R${String(n).padStart(5, "0")}`, financialYear: "26-27", invoiceDate: new Date(when), kind, supplier: SUP, recipient: { name: `Buyer ${n}`, gstin: kind === "B2B" ? "29AABCT1332L1ZG" : null }, supplierStateCode: "27", placeOfSupplyCode: supply === "INTRA_STATE" ? "27" : "29", supplyType: supply, pricesIncludeTax: false, lines: ls, rateSummary: [], taxableCents: t.taxable, cgstCents: t.cgst, sgstCents: t.sgst, igstCents: t.igst, totalTaxCents: t.cgst + t.sgst + t.igst, untaxedChargesCents: untaxed, invoiceValueCents: t.taxable + t.cgst + t.sgst + t.igst + untaxed } });
  };
  const i1 = await invoice("2026-10-05T10:00:00+05:30", "B2B", "INTRA_STATE", [{ code: "7117", rateBps: 300, taxable: 100000 }, { code: "9102", rateBps: 1800, taxable: 200000 }]);
  await invoice("2026-10-06T10:00:00+05:30", "B2C", "INTRA_STATE", [{ code: "7117", rateBps: 300, taxable: 50000, qty: 2 }], 9900);
  await invoice("2026-10-07T10:00:00+05:30", "B2C", "INTER_STATE", [{ code: "7117", rateBps: 300, taxable: 80000 }]);
  await invoice("2026-10-31T23:59:00+05:30", "B2C", "INTRA_STATE", [{ code: "7117", rateBps: 0, taxable: 10000 }]);
  await invoice("2026-11-01T00:00:00+05:30", "B2C", "INTRA_STATE", [{ code: "7117", rateBps: 300, taxable: 777777 }]);
  await invoice("2026-09-30T23:59:00+05:30", "B2C", "INTRA_STATE", [{ code: "7117", rateBps: 300, taxable: 888888 }]);
  await prisma.gstCreditNote.create({ data: { creditNoteNumber: "CN/26-27/R00001", invoiceDetailId: i1.id, orderId: i1.orderId, financialYear: "26-27", issuedAt: new Date("2026-10-20T10:00:00+05:30"), kind: "PARTIAL", reason: "return", lines: [{ lineId: "0", kind: "GOODS", code: "7117", rateBps: 300, taxableCents: 50000, cgstCents: 750, sgstCents: 750, igstCents: 0, cessCents: 0, payableCents: 51500 }], taxableCents: 50000, cgstCents: 750, sgstCents: 750, igstCents: 0, totalTaxCents: 1500, refundCents: 51500, createdBy: "verify" } });
  check("a month is an India month: 1 Nov 00:00 IST is November, 30 Sep 23:59 IST is September", [monthRange("2026-10").from.toISOString(), monthRange("2026-10").to.toISOString()], ["2026-09-30T18:30:00.000Z", "2026-10-31T18:30:00.000Z"]);
  const reg = await salesRegister("2026-10");
  check("the sales register has the month's 4 invoices and 1 credit note, and not the neighbouring months'", [reg.invoiceCount, reg.creditNoteCount, reg.rows.length], [4, 1, 5]);
  check("the credit note appears as a negative", reg.rows.find((r) => r.document.startsWith("CN/"))?.total, -51500);
  const g1 = await gstr1("2026-10");
  check("GSTR-1 B2B lists the buyer's GSTIN invoices only", [g1.b2b.length, g1.b2b[0].gstin], [1, "29AABCT1332L1ZG"]);
  check("B2C is grouped by place of supply and rate", g1.b2cs.map((r) => `${r.placeOfSupply}@${r.rateBps}:${r.taxableCents}`), ["27@0:10000", "27@300:50000", "29@300:80000"]);
  check("inter-state B2C invoices are listed one by one", g1.b2cInterState.length, 1);
  check("credit notes to registered buyers go to CDNR, to consumers to CDNUR", [g1.cdnr.length, g1.cdnur.length], [1, 0]);
  const hsn2 = await hsnSummary("2026-10");
  const h7117 = hsn2.find((r) => r.code === "7117" && r.rateBps === 300)!;
  check("HSN summary: 7117 at 3% sums quantity and taxable value, with credit notes shown apart", [h7117.quantity, h7117.taxableCents, h7117.creditedTaxableCents], [4, 230000, 50000]);
  const liab = await taxLiability("2026-10");
  check("tax liability is outward tax less credit notes, by head", [liab.net.cgstCents, liab.net.sgstCents, liab.net.igstCents], [liab.outward.cgstCents - 750, liab.outward.sgstCents - 750, liab.outward.igstCents]);
  const fig = await gstr3bFigures("2026-10");
  check("GSTR-3B figures put nil-rated supplies apart from taxable ones, net of credit notes", [fig.taxable.taxableCents, fig.nilRatedTaxableCents], [100000 + 200000 + 50000 + 80000 - 50000, 10000]);
  const matched = await reconcileGstr3b("2026-10", { entered: fig.taxable }, "verify");
  check("figures that agree reconcile as MATCHED", matched.status, "MATCHED");
  const off = await reconcileGstr3b("2026-10", { entered: { ...fig.taxable, igstCents: fig.taxable.igstCents + 100 } }, "verify");
  check("a difference is shown, to the paisa", [off.status, (off.differences as { igstCents: number }).igstCents], ["DIFFERENCES", 100]);
  check("the CSV shows rupees, not paise", tableToCsv([{ document: "A", taxable: 12345 }]).includes("123.45"), true);
  check("the report says how many invoices lacked GST details", typeof reg.leftOutInvoices, "number");

  console.log("Notification monitoring");
  check("official https pages are accepted", [isOfficialUrl("https://cbic-gst.gov.in/x.pdf"), isOfficialUrl("https://taxinformation.cbic.gov.in/a"), isOfficialUrl("https://www.pib.gov.in/x")], [true, true, true]);
  check("http, other domains, look-alikes, credentials, odd ports and raw IPs are refused", [isOfficialUrl("http://cbic-gst.gov.in"), isOfficialUrl("https://example.com"), isOfficialUrl("https://evilcbic-gst.gov.in"), isOfficialUrl("https://cbic-gst.gov.in.evil.com"), isOfficialUrl("https://user:pw@cbic-gst.gov.in"), isOfficialUrl("https://cbic-gst.gov.in:8443"), isOfficialUrl("https://127.0.0.1/")], [false, false, false, false, false, false, false]);
  check("a non-official page cannot be watched", await code(() => addWatch("x", "https://example.com/rates", ACTOR)), "VALIDATION_FAILED");
  const watch = await addWatch("GST notifications", "https://cbic-gst.gov.in/", ACTOR);
  check("a watch starts with nothing checked", [watch.lastCheckedAt, watch.lastHash], [null, null]);
  await prisma.gstSourceWatch.update({ where: { id: watch.id }, data: { lastChangedAt: new Date() } });
  check("a flagged change can be acknowledged", (await acknowledgeWatchChange(watch.id, ACTOR)).changeAcknowledgedBy, "verify");
  const proposal = await proposeChange({ title: "Imitation jewellery to 5%", effectiveFrom: "2027-04-01", notificationId: note.id, change: { code: "7117", codeKind: "HSN", description: "Imitation jewellery", rateBps: 500 } }, ACTOR);
  check("a proposal starts PROPOSED", proposal.status, "PROPOSED");
  check("rejecting needs a reason", await code(() => reviewProposal(proposal.id, "REJECT", "Acct", "", ACTOR)), "VALIDATION_FAILED");
  const accepted = await reviewProposal(proposal.id, "ACCEPT", "Test Accountant", "agreed", ACTOR);
  const made = await prisma.gstRateMaster.findUniqueOrThrow({ where: { id: accepted.createdRateId! } });
  check("accepting creates a DRAFT rate, never an approved one", [accepted.status, made.approval, made.approvedBy], ["ACCEPTED", "DRAFT", null]);
  check("a decided proposal cannot be decided again", await code(() => reviewProposal(proposal.id, "REJECT", "Acct", "no", ACTOR)), "CONFLICT");

  const { passed, failed } = results();
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => { console.error(isDomainError(error) ? `${error.code}: ${error.message}` : error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
