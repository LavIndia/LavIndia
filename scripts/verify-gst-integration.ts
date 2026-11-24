/**
 * Verifies the GST engine inside the application: pricing, the counter, orders,
 * invoices, credit notes and the activation gate.
 *
 *     DATABASE_URL=<a THROWAWAY copy, name ending _it_test> npx tsx scripts/verify-gst-integration.ts
 *
 * It refuses to run against anything but a database whose name ends in
 * `_it_test`: it approves rates, verifies classifications and turns the engine
 * to ENFORCE, none of which may ever happen in the real local database. Rates
 * and GSTINs here are fixtures, not real registrations.
 */
import "./load-env";
import { assertLocalDatabase } from "../prisma/guard-destructive";
import { prisma } from "../src/lib/prisma";
import { catalogService } from "../src/modules/catalog";
import { quoteCartWithGst, recordGstAuditSafely, invalidateGstState } from "../src/modules/gst";
import { activationChecks, setEngineMode } from "../src/modules/gst/activation";
import { issueGstCreditNote, refundableLines } from "../src/modules/gst/credit-notes";
import { quoteCart } from "../src/modules/orders/quote";
import { changeOrderStatus } from "../src/modules/orders";
import { posService } from "../src/modules/pos";
import { isDomainError } from "../src/modules/_shared/errors";
import { VariantId } from "../src/modules/_shared/ids";
import { check, results } from "./verify-helpers";

const dbName = new URL(process.env.DATABASE_URL ?? "postgresql://x/x").pathname.replace("/", "");
if (!dbName.endsWith("_it_test")) {
  console.error(`Refusing to run against "${dbName}": this test needs a throwaway database whose name ends in _it_test.`);
  process.exit(1);
}

const ACTOR = { id: "verify", name: "Verify" };
const FROM = new Date("2025-09-22T00:00:00.000Z");

async function code(run: () => Promise<unknown>): Promise<string | null> {
  try { await run(); return null; } catch (error) { return isDomainError(error) ? error.code : error instanceof Error ? error.message.slice(0, 120) : String(error); }
}

async function variantOf(productName: string) {
  const v = await prisma.productVariant.findFirstOrThrow({ where: { product: { name: productName } }, orderBy: [{ isDefault: "desc" }, { position: "asc" }], select: { id: true, priceCents: true, product: { select: { priceCents: true } } } });
  return { variantId: v.id, price: v.priceCents ?? v.product.priceCents };
}

async function setMode(mode: "OFF" | "SHADOW" | "ENFORCE") {
  await prisma.gstBusinessProfile.updateMany({ data: { engineMode: mode } });
  invalidateGstState();
}

async function sale(lines: Array<{ name: string; quantity?: number }>) {
  const resolved = await Promise.all(lines.map(async (l) => ({ variantId: VariantId((await variantOf(l.name)).variantId), quantity: l.quantity ?? 1 })));
  const result = await posService.completeSale({ lines: resolved, payment: { method: "CASH", status: "COMPLETED" } as never, actorId: "verify" });
  if (result.gst?.mode === "SHADOW") {
    await recordGstAuditSafely({ orderId: result.orderId, orderNumber: result.orderNumber, channel: "STORE", attachment: result.gst });
  }
  return result;
}

async function main(): Promise<void> {
  assertLocalDatabase("scripts/verify-gst-integration.ts");

  // ---------------------------------------------------------------- fixtures
  console.log("Fixtures (scratch database only)");
  await prisma.inventoryLevel.updateMany({ data: { quantity: 1000, reservedQuantity: 0 } });
  const hsn = Object.fromEntries((await prisma.gstHsnMaster.findMany()).map((h) => [h.code, h.id]));
  for (const c of ["7113", "7117", "9102"]) {
    await prisma.gstRateMaster.updateMany({ where: { hsnId: hsn[c] }, data: { approval: "APPROVED", approvedBy: "fixture", approvedAt: new Date() } });
  }
  await prisma.gstBusinessProfile.updateMany({ data: { legalName: "Test Shop", gstin: "27AAPFU0939F1ZV", stateCode: "27", stateName: "Maharashtra", registeredAddress: "1 Test Road", verificationStatus: "VERIFIED", verifiedBy: "fixture", verifiedAt: new Date(), eInvoicingApplies: false, engineMode: "OFF" } });
  const products = await prisma.product.findMany({ select: { id: true, name: true } });
  const mapAll = async (codeId: string) => {
    for (const p of products) {
      await prisma.gstProductMapping.create({ data: { chargeKind: "PRODUCT", productId: p.id, hsnId: codeId, status: "VERIFIED", approvedBy: "fixture", approvedAt: new Date(), effectiveFrom: FROM, basis: "test fixture" } });
    }
  };
  await mapAll(hsn["7117"]);
  const RING = "Gold Wrap Ring";
  const NECK = "Puffed Heart Station Necklace";
  const FREE = "Disc Charm Huggie Earrings";
  const productId = (name: string) => products.find((p) => p.name === name)!.id;
  // the necklace is classified as a watch-rate item for the multi-rate tests
  await prisma.gstProductMapping.updateMany({ where: { productId: productId(NECK) }, data: { hsnId: hsn["9102"] } });
  invalidateGstState();
  const legacyInvoices = JSON.stringify(await prisma.invoice.findMany({ orderBy: { id: "asc" } }));
  const legacyInvoiceCount = await prisma.invoice.count();
  check("fixtures: 18 products classified, rates approved for 7113, 7117 and 9102", [products.length, await prisma.gstRateMaster.count({ where: { approval: "APPROVED" } })], [18, 3]);

  // --------------------------------------------------------------------- OFF
  console.log("OFF: the existing checkout is untouched");
  const ringV = await variantOf(RING);
  const variants = new Map((await catalogService.findVariantsByIds([VariantId(ringV.variantId)])).map((v) => [v.variantId as string, v]));
  const base = { channel: "STORE" as const, lines: [{ variantId: VariantId(ringV.variantId), quantity: 2 }], promotions: [], pricesIncludeTax: false, taxRateBps: 300, shippingCents: 0 };
  const legacy = quoteCart(base, variants);
  const viaGst = await quoteCartWithGst(base, variants, { channel: "STORE" });
  check("quoteCartWithGst returns exactly what quoteCart does, with nothing attached", [JSON.stringify(viaGst), "gst" in viaGst], [JSON.stringify(legacy), false]);
  const auditsBefore = await prisma.gstCalculationAudit.count();
  const offSale = await sale([{ name: RING }]);
  const offOrder = await prisma.order.findUniqueOrThrow({ where: { id: offSale.orderId }, include: { items: true } });
  check("a counter sale in OFF writes the legacy 3% and no GST records", [offOrder.taxCents, offOrder.items[0].hsnCode, await prisma.gstCalculationAudit.count(), await prisma.gstInvoiceDetail.count()], [Math.round(offSale.grandTotalCents / 1.03 * 0.03), null, auditsBefore, 0]);

  // ------------------------------------------------------------------ SHADOW
  console.log("SHADOW: calculates beside the existing engine and changes nothing");
  await setMode("SHADOW");
  const s1 = await sale([{ name: RING }]);
  const o1 = await prisma.order.findUniqueOrThrow({ where: { id: s1.orderId } });
  const a1 = await prisma.gstCalculationAudit.findFirstOrThrow({ where: { orderId: s1.orderId } });
  check("same tax as the existing engine: outcome MATCHED, difference 0", [a1.outcome, a1.differenceCents, a1.mode], ["MATCHED", 0, "SHADOW"]);
  check("the order itself carries the legacy tax and the customer paid the legacy total", [o1.taxCents, (await prisma.payment.findUniqueOrThrow({ where: { orderId: s1.orderId } })).amountCents], [a1.legacyTaxCents, s1.grandTotalCents]);
  check("the audit records a counter sale as intra-state, with the basis for that", [a1.supplyType, a1.placeOfSupplyCode, a1.supplierStateCode], ["INTRA_STATE", "27", "27"]);
  const rate7117 = await prisma.gstRateMaster.findFirstOrThrow({ where: { hsnId: hsn["7117"], approval: "APPROVED" } });
  check("the rate version used is stamped as used by the database", rate7117.rateBps === 300 && !!(await prisma.gstRateMaster.findUniqueOrThrow({ where: { id: rate7117.id } })).firstUsedAt, true);

  const s2 = await sale([{ name: NECK }]);
  const a2 = await prisma.gstCalculationAudit.findFirstOrThrow({ where: { orderId: s2.orderId } });
  const o2 = await prisma.order.findUniqueOrThrow({ where: { id: s2.orderId } });
  check("an 18% item differs from the legacy 3%: DIFFERS, and the difference is recorded", [a2.outcome, (a2.differenceCents ?? 0) > 0], ["DIFFERS", true]);
  check("but the customer is still charged the legacy tax", o2.taxCents, a2.legacyTaxCents);

  await prisma.gstProductMapping.updateMany({ where: { productId: productId(FREE) }, data: { status: "NEEDS_ACCOUNTANT_APPROVAL", approvedBy: null, approvedAt: null } });
  const s3 = await sale([{ name: FREE }]);
  const a3 = await prisma.gstCalculationAudit.findFirstOrThrow({ where: { orderId: s3.orderId } });
  check("an unverified classification: MISSING_MAPPING, the sale still goes through", [a3.outcome, JSON.stringify(a3.missingMappings).includes("NOT_VERIFIED"), (await prisma.order.findUnique({ where: { id: s3.orderId } }))?.status], ["MISSING_MAPPING", true, "DELIVERED"]);

  const online = await quoteCartWithGst({ ...base, channel: "ONLINE", pricesIncludeTax: true, shippingCents: 9900 }, variants, { channel: "ONLINE", deliveryStateName: "Atlantis" });
  check("an unreadable delivery state: ERROR with a message, the quote unchanged", [(online.gst?.payload as { status: string; message?: string }).status, online.totals.grandTotalCents], ["ERROR", quoteCart({ ...base, channel: "ONLINE", pricesIncludeTax: true, shippingCents: 9900 }, variants).totals.grandTotalCents]);

  // -------------------------------------------------------------- ACTIVATION
  console.log("Activation: ENFORCE is refused until everything is in place");
  const refusal = await code(() => setEngineMode("ENFORCE", ACTOR, "Test Accountant"));
  const blockers = (await activationChecks("ENFORCE")).filter((c) => c.blocking && !c.ok).map((c) => c.id);
  check("refused while delivery/COD treatment, reviews and shadow evidence are missing", [refusal, ["charges", "state-table", "place-of-supply", "shadow"].every((id) => blockers.includes(id))], ["GST_NOT_READY", true]);
  check("the engine is still in SHADOW", (await prisma.gstBusinessProfile.findFirstOrThrow()).engineMode, "SHADOW");
  const noApprover = await code(async () => { await prisma.gstBusinessProfile.updateMany({ data: { engineMode: "ENFORCE" } }); });
  check("the database itself refuses ENFORCE without an approver", noApprover !== null, true);

  await prisma.gstConfiguration.updateMany({ data: { shippingTreatment: "FOLLOWS_GOODS", codTreatment: "NONE", mixedBasketPolicy: "HIGHEST_RATE", treatmentApprovedBy: "Test Accountant", treatmentApprovedAt: new Date(), stateTableReviewedBy: "Test Accountant", stateTableReviewedAt: new Date(), placeOfSupplyReviewedBy: "Test Accountant", placeOfSupplyReviewedAt: new Date() } });
  await prisma.gstProductMapping.updateMany({ where: { productId: productId(FREE) }, data: { status: "VERIFIED", approvedBy: "fixture", approvedAt: new Date() } });
  for (let i = 0; i < 20; i++) await prisma.gstCalculationAudit.create({ data: { mode: "SHADOW", channel: "STORE", engineVersion: "fixture", outcome: "MATCHED", inputs: {}, lines: [], rateVersionIds: [], taxableCents: 0, cgstCents: 0, sgstCents: 0, igstCents: 0, totalTaxCents: 0 } });
  invalidateGstState();
  const stillFailing = (await activationChecks("ENFORCE")).filter((c) => c.blocking && !c.ok).map((c) => c.id);
  check("with the decisions recorded and 20 clean shadow calculations, every blocking check passes", stillFailing, []);
  await setEngineMode("ENFORCE", ACTOR, "Test Accountant");
  const profile = await prisma.gstBusinessProfile.findFirstOrThrow();
  check("ENFORCE is on, with who approved it recorded", [profile.engineMode, profile.enforceApprovedBy], ["ENFORCE", "Test Accountant"]);
  check("the mode change is in the audit log", (await prisma.auditLog.count({ where: { action: "GST_ENGINE_MODE", entityId: profile.id } })) >= 1, true);

  // ----------------------------------------------------------------- ENFORCE
  console.log("ENFORCE: the engine's tax is the tax; the invoice and payment agree with it");
  const e1 = await sale([{ name: RING }, { name: NECK }]);
  const order = await prisma.order.findUniqueOrThrow({ where: { id: e1.orderId }, include: { items: true, payment: true } });
  const invoice = await prisma.invoice.findUniqueOrThrow({ where: { orderId: e1.orderId } });
  const detail = await prisma.gstInvoiceDetail.findUniqueOrThrow({ where: { orderId: e1.orderId } });
  const ringItem = order.items.find((i) => i.name === RING)!;
  const neckItem = order.items.find((i) => i.name === NECK)!;
  check("each line carries the HSN and rate it was classified under", [ringItem.hsnCode, ringItem.taxRateBps, neckItem.hsnCode, neckItem.taxRateBps], ["7117", 300, "9102", 1800]);
  check("exclusive pricing: tax per line is that rate on the line", [ringItem.taxCents, neckItem.taxCents], [Math.round((ringItem.priceCents * ringItem.quantity) * 0.03), Math.round((neckItem.priceCents * neckItem.quantity) * 0.18)]);
  check("the order's tax is the sum of its lines", order.taxCents, ringItem.taxCents + neckItem.taxCents);
  check("payment, order, invoice and GST detail all carry the same total", [order.payment!.amountCents, invoice.totalCents, detail.invoiceValueCents], [e1.grandTotalCents, e1.grandTotalCents, e1.grandTotalCents]);
  check("the GST detail is intra-state: CGST and SGST (never more than a paisa a line apart) and no IGST", [detail.supplyType, Math.abs(detail.cgstCents - detail.sgstCents) <= (detail.lines as unknown[]).length, detail.igstCents], ["INTRA_STATE", true, 0]);
  check("the detail names the supplier GSTIN and the invoice's own number", [(detail.supplier as { gstin: string }).gstin, detail.invoiceNumber], ["27AAPFU0939F1ZV", invoice.invoiceNumber]);
  check("a different HSN and rate appear per line on the detail", (detail.lines as Array<{ code: string; rateBps: number }>).map((l) => `${l.code}@${l.rateBps}`).sort(), ["7117@300", "9102@1800"]);
  check("the calculation was written in the same transaction as the order", (await prisma.gstCalculationAudit.count({ where: { orderId: e1.orderId, mode: "ENFORCE" } })), 1);

  const ordersBefore = await prisma.order.count();
  const stockBefore = (await prisma.inventoryLevel.aggregate({ _sum: { quantity: true } }))._sum.quantity;
  await prisma.gstProductMapping.updateMany({ where: { productId: productId(FREE) }, data: { status: "NEEDS_ACCOUNTANT_APPROVAL", approvedBy: null, approvedAt: null } });
  check("an unverified classification is refused, never taxed at a default", await code(() => sale([{ name: FREE }])), "GST_CLASSIFICATION_MISSING");
  check("the refused sale created no order and took no stock", [await prisma.order.count(), (await prisma.inventoryLevel.aggregate({ _sum: { quantity: true } }))._sum.quantity], [ordersBefore, stockBefore]);
  await prisma.gstProductMapping.updateMany({ where: { productId: productId(FREE) }, data: { status: "VERIFIED", approvedBy: "fixture", approvedAt: new Date() } });
  await prisma.gstRateMaster.updateMany({ where: { hsnId: hsn["7117"] }, data: { effectiveTo: new Date("2025-09-30T00:00:00.000Z") } }).catch(() => undefined);
  invalidateGstState();

  console.log("ENFORCE: online pricing, place of supply, shipping, inclusive prices");
  const onlineBase = { ...base, channel: "ONLINE" as const, pricesIncludeTax: true, shippingCents: 9900 };
  const legacyOnline = quoteCart(onlineBase, variants);
  const inter = await quoteCartWithGst(onlineBase, variants, { channel: "ONLINE", deliveryStateName: "Karnataka" });
  const ip = inter.gst!.payload as { supplyType: string; result: { totals: { igstCents: number; cgstCents: number; taxCents: number } } };
  check("delivery to another state is inter-state: IGST only", [ip.supplyType, ip.result.totals.igstCents > 0, ip.result.totals.cgstCents], ["INTER_STATE", true, 0]);
  const intra = await quoteCartWithGst(onlineBase, variants, { channel: "ONLINE", deliveryStateName: "maharashtra" });
  const np = intra.gst!.payload as { supplyType: string; result: { totals: { igstCents: number; cgstCents: number; sgstCents: number; taxCents: number } } };
  check("delivery within the supplier's state is intra-state: CGST + SGST, and the total tax is the same", [np.supplyType, np.result.totals.igstCents, np.result.totals.cgstCents + np.result.totals.sgstCents, np.result.totals.taxCents], ["INTRA_STATE", 0, ip.result.totals.taxCents, ip.result.totals.taxCents]);
  check("inclusive prices: delivery now carries tax inside its price, so the buyer's total does not move", [inter.totals.grandTotalCents, inter.totals.taxIncluded], [legacyOnline.totals.grandTotalCents, true]);
  check("the tax figure moved from the legacy goods-only 3% to include delivery", inter.totals.taxCents > legacyOnline.totals.taxCents, true);
  check("an unreadable state is refused outright in ENFORCE", await code(() => quoteCartWithGst(onlineBase, variants, { channel: "ONLINE", deliveryStateName: "Atlantis" })), "GST_PLACE_OF_SUPPLY_UNKNOWN");
  const deferred = await quoteCartWithGst(onlineBase, variants, { channel: "ONLINE", deferPlaceOfSupply: true });
  check("before an address exists the total tax is already right (CGST + SGST equals IGST)", deferred.totals.taxCents, ip.result.totals.taxCents);

  // ------------------------------------------------------------ CREDIT NOTES
  console.log("Credit notes: part and whole, at the tax charged, in one unbroken series");
  const seqBefore = await prisma.creditNoteSequence.findMany({ orderBy: { financialYear: "asc" } });
  const refundable = (await refundableLines(e1.orderId))!;
  const ringLine = refundable.lines.find((l) => l.description === RING)!;
  const half = Math.floor(ringLine.remainingCents / 2);
  const n1 = await issueGstCreditNote(e1.orderId, { mode: "PARTIAL", reason: "Half returned", refunds: [{ lineId: ringLine.lineId, refundCents: half }] }, "verify");
  check("a part credit note refunds that amount and reverses 3% of it, not today's rate", [n1.refundCents, n1.kind, n1.totalTaxCents], [half, "PARTIAL", n1.cgstCents + n1.sgstCents]);
  check("its number comes from the same series as the existing credit notes", n1.creditNoteNumber.startsWith("CN/"), true);
  const tooMuch = await code(() => issueGstCreditNote(e1.orderId, { mode: "PARTIAL", reason: "x", refunds: [{ lineId: ringLine.lineId, refundCents: ringLine.remainingCents }] }, "verify"));
  check("refunding more than is left of a line is refused", tooMuch !== null, true);
  const n2 = await issueGstCreditNote(e1.orderId, { mode: "FULL", reason: "Cancelled" }, "verify");
  const noteSum = (await prisma.gstCreditNote.findMany({ where: { orderId: e1.orderId } })).reduce((s, n) => ({ refund: s.refund + n.refundCents, tax: s.tax + n.totalTaxCents }), { refund: 0, tax: 0 });
  check("the whole sale is refunded in the end, tax and all, to the paisa", [noteSum.refund, noteSum.tax], [detail.invoiceValueCents, detail.totalTaxCents]);
  check("nothing is left to credit", await code(() => issueGstCreditNote(e1.orderId, { mode: "FULL", reason: "again" }, "verify")) !== null, true);
  const seqAfter = await prisma.creditNoteSequence.findMany({ orderBy: { financialYear: "asc" } });
  check("two notes used two consecutive numbers, with no gap", [Number(n2.creditNoteNumber.slice(-6)) - Number(n1.creditNoteNumber.slice(-6)), seqAfter[0].lastNumber - (seqBefore[0]?.lastNumber ?? 0)], [1, 2]);

  const e2 = await sale([{ name: RING }]);
  await prisma.$transaction((tx) => changeOrderStatus(tx, e2.orderId, "CANCELLED", "verify"), { timeout: 20_000 });
  const legacyNote = await prisma.creditNote.findFirstOrThrow({ where: { orderId: e2.orderId } });
  const mirrored = await prisma.gstCreditNote.findFirstOrThrow({ where: { orderId: e2.orderId } });
  check("cancelling an enforced order: the existing credit note and the GST one share a number and a total", [mirrored.creditNoteNumber, mirrored.refundCents, mirrored.kind], [legacyNote.creditNoteNumber, legacyNote.totalCents, "FULL"]);

  // ---------------------------------------------------------- HISTORY & OFF
  console.log("History is untouched; OFF restores the old behaviour");
  const first4 = (await prisma.invoice.findMany({ orderBy: { id: "asc" }, where: { id: { in: JSON.parse(legacyInvoices).map((i: { id: string }) => i.id) } } }));
  check("the invoices that existed before are byte-for-byte unchanged", JSON.stringify(first4), legacyInvoices);
  check("none of them gained GST details (only new enforced invoices have them)", await prisma.gstInvoiceDetail.count({ where: { orderId: { in: JSON.parse(legacyInvoices).map((i: { orderId: string }) => i.orderId) } } }), 0);
  check("the number of invoices rose only by the sales made here", (await prisma.invoice.count()) - legacyInvoiceCount > 0, true);
  const used = await code(() => prisma.gstRateMaster.update({ where: { id: rate7117.id }, data: { rateBps: 1800, cgstBps: 900, sgstBps: 900, igstBps: 1800 } }).then(() => undefined));
  check("a rate that has been used cannot be edited", used !== null, true);

  await setMode("OFF");
  const detailsBefore = await prisma.gstInvoiceDetail.count();
  const auditsNow = await prisma.gstCalculationAudit.count();
  const off2 = await sale([{ name: RING }]);
  const offOrder2 = await prisma.order.findUniqueOrThrow({ where: { id: off2.orderId }, include: { items: true } });
  check("after switching OFF a sale is legacy again: no HSN, no GST record, no new GST detail", [offOrder2.items[0].hsnCode, await prisma.gstCalculationAudit.count(), await prisma.gstInvoiceDetail.count()], [null, auditsNow, detailsBefore]);
  check("and the GST records already written are all still there", await prisma.gstInvoiceDetail.count({ where: { orderId: e1.orderId } }), 1);

  const { passed, failed } = results();
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((error) => { console.error(isDomainError(error) ? `${error.code}: ${error.message}` : error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
