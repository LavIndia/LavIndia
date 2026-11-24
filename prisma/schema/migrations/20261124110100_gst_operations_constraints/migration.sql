-- Constraints, functions and triggers for the GST operations tables created by
-- 20261124110000_gst_operations_tables.
--
-- Every statement targets a gst_* table. No existing application table is
-- touched and no extension is installed.
--
-- Issued documents — GST invoice details and credit notes — cannot be changed
-- or deleted once written, apart from the e-invoice fields of an invoice
-- detail, which are filled in after the invoice exists. The classification
-- trail is append-only.

-- =========================================================================
-- Configuration
-- =========================================================================

CREATE UNIQUE INDEX "gst_configuration_single_row" ON "gst_configuration" ((true));

ALTER TABLE "gst_configuration"
  -- Choosing how delivery or COD is taxed is a decision someone answers for.
  ADD CONSTRAINT "gst_configuration_decided_check"
  CHECK (("shippingTreatment" = 'UNSET' AND "codTreatment" = 'UNSET')
         OR ("treatmentApprovedBy" IS NOT NULL AND "treatmentApprovedAt" IS NOT NULL)),
  ADD CONSTRAINT "gst_configuration_policy_check"
  CHECK (("shippingTreatment" <> 'FOLLOWS_GOODS' AND "codTreatment" <> 'FOLLOWS_GOODS')
         OR "mixedBasketPolicy" IS NOT NULL);

-- =========================================================================
-- Product profiles and supplier papers
-- =========================================================================

ALTER TABLE "gst_product_profiles"
  ADD CONSTRAINT "gst_product_profiles_complete_check"
  CHECK ("infoStatus" <> 'COMPLETE'
         OR ("baseMetal" IS NOT NULL AND "platingType" <> 'UNKNOWN'
             AND "confirmedBy" IS NOT NULL AND "confirmedAt" IS NOT NULL)),
  ADD CONSTRAINT "gst_product_profiles_weight_check"
  CHECK ("preciousWeightMg" IS NULL OR "preciousWeightMg" >= 0),
  ADD CONSTRAINT "gst_product_profiles_supplier_hsn_check"
  CHECK ("supplierHsn" IS NULL OR "supplierHsn" ~ '^[0-9]{2,8}$'),
  ADD CONSTRAINT "gst_product_profiles_gems_check"
  CHECK ("gems" IS NULL OR jsonb_typeof("gems") = 'array');

ALTER TABLE "gst_supplier_documents"
  ADD CONSTRAINT "gst_supplier_documents_size_check"
  CHECK ("sizeBytes" = octet_length("content") AND "sizeBytes" BETWEEN 1 AND 5242880),
  ADD CONSTRAINT "gst_supplier_documents_mime_check"
  CHECK ("mimeType" IN ('application/pdf', 'image/jpeg', 'image/png')),
  ADD CONSTRAINT "gst_supplier_documents_sha256_check"
  CHECK ("sha256" ~ '^[0-9a-f]{64}$');

-- An uploaded paper is evidence: its bytes cannot be swapped for others.
CREATE FUNCTION "gst_supplier_documents_guard_update"() RETURNS trigger
LANGUAGE plpgsql AS $fn$
BEGIN
  IF NEW."content" IS DISTINCT FROM OLD."content"
     OR NEW."sha256" IS DISTINCT FROM OLD."sha256"
     OR NEW."sizeBytes" IS DISTINCT FROM OLD."sizeBytes"
     OR NEW."mimeType" IS DISTINCT FROM OLD."mimeType"
     OR NEW."fileName" IS DISTINCT FROM OLD."fileName" THEN
    RAISE EXCEPTION 'An uploaded supplier document cannot be replaced; upload the new one separately'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END
$fn$;

CREATE TRIGGER "gst_supplier_documents_guard_update"
  BEFORE UPDATE ON "gst_supplier_documents"
  FOR EACH ROW EXECUTE FUNCTION "gst_supplier_documents_guard_update"();

-- =========================================================================
-- The classification trail is append-only
-- =========================================================================

ALTER TABLE "gst_classification_events"
  ADD CONSTRAINT "gst_classification_events_approved_check"
  CHECK ("action" <> 'APPROVED' OR btrim(COALESCE("approverName", '')) <> ''),
  ADD CONSTRAINT "gst_classification_events_rejected_check"
  CHECK ("action" <> 'REJECTED' OR (btrim(COALESCE("reason", '')) <> ''
                                    AND btrim(COALESCE("approverName", '')) <> '')),
  ADD CONSTRAINT "gst_classification_events_product_check"
  CHECK ("action" NOT IN ('SUBMITTED', 'APPROVED', 'REJECTED') OR "productId" IS NOT NULL);

CREATE FUNCTION "gst_append_only"() RETURNS trigger
LANGUAGE plpgsql AS $fn$
BEGIN
  RAISE EXCEPTION '% is append-only: rows cannot be changed or deleted', TG_TABLE_NAME
    USING ERRCODE = 'check_violation';
END
$fn$;

CREATE TRIGGER "gst_classification_events_append_only"
  BEFORE UPDATE OR DELETE ON "gst_classification_events"
  FOR EACH ROW EXECUTE FUNCTION "gst_append_only"();

-- =========================================================================
-- GST invoice details
-- =========================================================================

ALTER TABLE "gst_invoice_details"
  ADD CONSTRAINT "gst_invoice_details_nonnegative_check"
  CHECK ("taxableCents" >= 0 AND "cgstCents" >= 0 AND "sgstCents" >= 0 AND "igstCents" >= 0
         AND "cessCents" >= 0 AND "untaxedChargesCents" >= 0),
  ADD CONSTRAINT "gst_invoice_details_total_tax_check"
  CHECK ("totalTaxCents" = "cgstCents" + "sgstCents" + "igstCents" + "cessCents"),
  ADD CONSTRAINT "gst_invoice_details_value_check"
  CHECK ("invoiceValueCents" = "taxableCents" + "totalTaxCents" + "untaxedChargesCents"),
  ADD CONSTRAINT "gst_invoice_details_supply_check"
  CHECK (("supplyType" = 'INTRA_STATE' AND "igstCents" = 0)
         OR ("supplyType" = 'INTER_STATE' AND "cgstCents" = 0 AND "sgstCents" = 0)),
  ADD CONSTRAINT "gst_invoice_details_state_codes_check"
  CHECK ("supplierStateCode" ~ '^(0[1-9]|[12][0-9]|3[0-8]|97|99)$'
         AND "placeOfSupplyCode" ~ '^(0[1-9]|[12][0-9]|3[0-8]|97|99)$'),
  ADD CONSTRAINT "gst_invoice_details_place_matches_supply_check"
  CHECK (("supplyType" = 'INTRA_STATE') = ("supplierStateCode" = "placeOfSupplyCode")),
  -- A business-to-business invoice carries the buyer's GSTIN.
  ADD CONSTRAINT "gst_invoice_details_b2b_check"
  CHECK ("kind" <> 'B2B' OR COALESCE("recipient" ->> 'gstin', '') <> ''),
  -- The supplier's GSTIN is on every GST invoice.
  ADD CONSTRAINT "gst_invoice_details_supplier_gstin_check"
  CHECK (COALESCE("supplier" ->> 'gstin', '') ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$'),
  ADD CONSTRAINT "gst_invoice_details_lines_check"
  CHECK (jsonb_typeof("lines") = 'array' AND jsonb_array_length("lines") > 0),
  ADD CONSTRAINT "gst_invoice_details_einvoice_check"
  CHECK ("eInvoiceStatus" <> 'GENERATED' OR ("irn" IS NOT NULL AND "ackNumber" IS NOT NULL AND "ackDate" IS NOT NULL));

-- Issued: nothing but the e-invoice fields (and updatedAt) may change.
CREATE FUNCTION "gst_invoice_details_guard_update"() RETURNS trigger
LANGUAGE plpgsql AS $fn$
DECLARE
  open_keys text[] := ARRAY['eInvoiceStatus', 'irn', 'ackNumber', 'ackDate', 'updatedAt'];
BEGIN
  IF (to_jsonb(NEW) - open_keys) IS DISTINCT FROM (to_jsonb(OLD) - open_keys) THEN
    RAISE EXCEPTION 'GST invoice detail % is issued and cannot be changed', OLD."invoiceNumber"
      USING ERRCODE = 'check_violation';
  END IF;
  IF OLD."irn" IS NOT NULL AND NEW."irn" IS DISTINCT FROM OLD."irn" THEN
    RAISE EXCEPTION 'The IRN of GST invoice % cannot be changed once recorded', OLD."invoiceNumber"
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END
$fn$;

CREATE TRIGGER "gst_invoice_details_guard_update"
  BEFORE UPDATE ON "gst_invoice_details"
  FOR EACH ROW EXECUTE FUNCTION "gst_invoice_details_guard_update"();

CREATE FUNCTION "gst_issued_no_delete"() RETURNS trigger
LANGUAGE plpgsql AS $fn$
BEGIN
  RAISE EXCEPTION '% rows are issued documents and cannot be deleted', TG_TABLE_NAME
    USING ERRCODE = 'check_violation';
END
$fn$;

CREATE TRIGGER "gst_invoice_details_no_delete"
  BEFORE DELETE ON "gst_invoice_details"
  FOR EACH ROW EXECUTE FUNCTION "gst_issued_no_delete"();

-- =========================================================================
-- GST credit notes
-- =========================================================================

ALTER TABLE "gst_credit_notes"
  ADD CONSTRAINT "gst_credit_notes_nonnegative_check"
  CHECK ("taxableCents" >= 0 AND "cgstCents" >= 0 AND "sgstCents" >= 0 AND "igstCents" >= 0
         AND "cessCents" >= 0 AND "refundCents" > 0),
  ADD CONSTRAINT "gst_credit_notes_total_tax_check"
  CHECK ("totalTaxCents" = "cgstCents" + "sgstCents" + "igstCents" + "cessCents"),
  -- What is refunded covers the taxable value and the tax, plus any untaxed charge sent back.
  ADD CONSTRAINT "gst_credit_notes_refund_check"
  CHECK ("refundCents" >= "taxableCents" + "totalTaxCents"),
  ADD CONSTRAINT "gst_credit_notes_reason_check"
  CHECK (btrim("reason") <> ''),
  ADD CONSTRAINT "gst_credit_notes_lines_check"
  CHECK (jsonb_typeof("lines") = 'array' AND jsonb_array_length("lines") > 0);

-- Credit notes against one invoice can never reverse more than it charged.
-- Serialised per invoice, so two refunds at the same moment cannot both pass.
CREATE FUNCTION "gst_credit_notes_cap"() RETURNS trigger
LANGUAGE plpgsql AS $fn$
DECLARE
  inv  record;
  used record;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('gst_credit_notes:' || NEW."invoiceDetailId", 0));

  SELECT "invoiceValueCents", "taxableCents", "cgstCents", "sgstCents", "igstCents", "cessCents"
    INTO inv FROM "gst_invoice_details" WHERE "id" = NEW."invoiceDetailId";
  IF NOT FOUND THEN
    RAISE EXCEPTION 'A credit note refers to an invoice that does not exist'
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  SELECT COALESCE(sum("refundCents"), 0)  AS refund,
         COALESCE(sum("taxableCents"), 0) AS taxable,
         COALESCE(sum("cgstCents"), 0)    AS cgst,
         COALESCE(sum("sgstCents"), 0)    AS sgst,
         COALESCE(sum("igstCents"), 0)    AS igst,
         COALESCE(sum("cessCents"), 0)    AS cess
    INTO used FROM "gst_credit_notes" WHERE "invoiceDetailId" = NEW."invoiceDetailId";

  IF used.refund  + NEW."refundCents"  > inv."invoiceValueCents"
     OR used.taxable + NEW."taxableCents" > inv."taxableCents"
     OR used.cgst + NEW."cgstCents" > inv."cgstCents"
     OR used.sgst + NEW."sgstCents" > inv."sgstCents"
     OR used.igst + NEW."igstCents" > inv."igstCents"
     OR used.cess + NEW."cessCents" > inv."cessCents" THEN
    RAISE EXCEPTION 'Credit notes would reverse more than the invoice charged'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END
$fn$;

CREATE TRIGGER "gst_credit_notes_cap"
  BEFORE INSERT ON "gst_credit_notes"
  FOR EACH ROW EXECUTE FUNCTION "gst_credit_notes_cap"();

CREATE TRIGGER "gst_credit_notes_immutable"
  BEFORE UPDATE OR DELETE ON "gst_credit_notes"
  FOR EACH ROW EXECUTE FUNCTION "gst_append_only"();

-- =========================================================================
-- Proposals, watches, reconciliations, pending catalog items
-- =========================================================================

ALTER TABLE "gst_rate_proposals"
  ADD CONSTRAINT "gst_rate_proposals_reviewed_check"
  CHECK ("status" NOT IN ('ACCEPTED', 'REJECTED') OR ("reviewedBy" IS NOT NULL AND "reviewedAt" IS NOT NULL)),
  ADD CONSTRAINT "gst_rate_proposals_accepted_check"
  CHECK ("status" <> 'ACCEPTED' OR "createdRateId" IS NOT NULL),
  ADD CONSTRAINT "gst_rate_proposals_rejected_check"
  CHECK ("status" <> 'REJECTED' OR btrim(COALESCE("reviewNote", '')) <> ''),
  ADD CONSTRAINT "gst_rate_proposals_change_check"
  CHECK (jsonb_typeof("proposedChange") = 'object');

ALTER TABLE "gst_source_watches"
  ADD CONSTRAINT "gst_source_watches_url_check"
  CHECK ("url" ~ '^https://');

ALTER TABLE "gst_return_reconciliations"
  ADD CONSTRAINT "gst_return_reconciliations_period_check"
  CHECK ("period" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  ADD CONSTRAINT "gst_return_reconciliations_json_check"
  CHECK (jsonb_typeof("entered") = 'object' AND jsonb_typeof("computed") = 'object'
         AND jsonb_typeof("differences") = 'object');

ALTER TABLE "gst_pending_catalog_items"
  ADD CONSTRAINT "gst_pending_catalog_items_imported_check"
  CHECK ("status" <> 'IMPORTED' OR "matchedProductId" IS NOT NULL),
  ADD CONSTRAINT "gst_pending_catalog_items_name_check"
  CHECK (btrim("name") <> '');
