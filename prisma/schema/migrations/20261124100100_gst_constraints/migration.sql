-- GST constraints, functions and triggers.
--
-- Applies to the seven gst_* tables created by 20261124100000_gst_tables ONLY.
-- Every statement targets a gst_* table; nothing here touches an existing
-- application table, and no extension is installed.
--
-- Conventions
--   * A band of unit values is in paise and INCLUSIVE at both ends.
--   * A date range runs from effectiveFrom to effectiveTo INCLUSIVE; a null
--     effectiveTo means "still current".
--   * Overlap checks take a transaction-scoped advisory lock on the code being
--     changed, then look for a conflict. Two sessions writing the same code are
--     therefore serialised, and the second sees the first's committed row. This
--     relies on READ COMMITTED, which is Prisma's and PostgreSQL's default.

-- =========================================================================
-- Formats and ranges
-- =========================================================================

ALTER TABLE "gst_hsn_master"
  ADD CONSTRAINT "gst_hsn_master_code_format_check"
  CHECK ("code" ~ '^[0-9]{2}([0-9]{2}([0-9]{2}([0-9]{2})?)?)?$');

-- Every SAC starts 99: four-digit heading or six-digit code.
ALTER TABLE "gst_sac_master"
  ADD CONSTRAINT "gst_sac_master_code_format_check"
  CHECK ("code" ~ '^99[0-9]{2}([0-9]{2})?$');

ALTER TABLE "gst_notifications"
  ADD CONSTRAINT "gst_notifications_number_not_blank_check"
  CHECK (btrim("number") <> '');

-- =========================================================================
-- Rates
-- =========================================================================

ALTER TABLE "gst_rate_master"
  ADD CONSTRAINT "gst_rate_master_one_code_check"
  CHECK (("hsnId" IS NULL) <> ("sacId" IS NULL)),
  ADD CONSTRAINT "gst_rate_master_bps_range_check"
  CHECK ("rateBps" BETWEEN 0 AND 10000 AND "cgstBps" >= 0 AND "sgstBps" >= 0
         AND "igstBps" >= 0 AND "cessBps" >= 0),
  ADD CONSTRAINT "gst_rate_master_split_check"
  CHECK ("cgstBps" + "sgstBps" = "rateBps" AND "igstBps" = "rateBps"),
  ADD CONSTRAINT "gst_rate_master_dates_check"
  CHECK ("effectiveTo" IS NULL OR "effectiveTo" >= "effectiveFrom"),
  ADD CONSTRAINT "gst_rate_master_band_check"
  CHECK (("minUnitValueCents" IS NULL OR "minUnitValueCents" >= 0)
         AND ("maxUnitValueCents" IS NULL OR "maxUnitValueCents" >= 0)
         AND ("minUnitValueCents" IS NULL OR "maxUnitValueCents" IS NULL
              OR "minUnitValueCents" <= "maxUnitValueCents")),
  -- An approved rate says who approved it and what it rests on.
  ADD CONSTRAINT "gst_rate_master_approved_check"
  CHECK ("approval" = 'DRAFT'
         OR ("approvedBy" IS NOT NULL AND "approvedAt" IS NOT NULL
             AND "notificationId" IS NOT NULL));

-- =========================================================================
-- Mappings
-- =========================================================================

ALTER TABLE "gst_product_mappings"
  ADD CONSTRAINT "gst_product_mappings_not_both_check"
  CHECK (NOT ("hsnId" IS NOT NULL AND "sacId" IS NOT NULL)),
  -- A draft may be unclassified; a VERIFIED one has exactly one code and an approver.
  ADD CONSTRAINT "gst_product_mappings_verified_check"
  CHECK ("status" <> 'VERIFIED'
         OR (("hsnId" IS NULL) <> ("sacId" IS NULL)
             AND "approvedBy" IS NOT NULL AND "approvedAt" IS NOT NULL)),
  -- A piece names its product (and optionally a variant of it); a shipping or
  -- cash-on-delivery charge names neither.
  ADD CONSTRAINT "gst_product_mappings_kind_check"
  CHECK (("chargeKind" = 'PRODUCT' AND "productId" IS NOT NULL)
         OR ("chargeKind" IN ('SHIPPING', 'COD_FEE')
             AND "productId" IS NULL AND "variantId" IS NULL)),
  -- A piece is goods, so it takes an HSN, never a SAC.
  ADD CONSTRAINT "gst_product_mappings_goods_check"
  CHECK ("chargeKind" <> 'PRODUCT' OR "sacId" IS NULL),
  ADD CONSTRAINT "gst_product_mappings_dates_check"
  CHECK ("effectiveTo" IS NULL OR "effectiveTo" >= "effectiveFrom");

-- =========================================================================
-- Business profile
-- =========================================================================

-- One row, ever: every row indexes the same constant.
CREATE UNIQUE INDEX "gst_business_profile_single_row" ON "gst_business_profile" ((true));

ALTER TABLE "gst_business_profile"
  ADD CONSTRAINT "gst_business_profile_gstin_format_check"
  CHECK ("gstin" IS NULL
         OR "gstin" ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$'),
  ADD CONSTRAINT "gst_business_profile_state_code_check"
  CHECK ("stateCode" IS NULL
         OR "stateCode" ~ '^(0[1-9]|[12][0-9]|3[0-8]|97|99)$'),
  -- The first two characters of a GSTIN are the state: they must agree.
  ADD CONSTRAINT "gst_business_profile_state_matches_gstin_check"
  CHECK ("gstin" IS NULL OR ("stateCode" IS NOT NULL AND "stateCode" = left("gstin", 2))),
  ADD CONSTRAINT "gst_business_profile_verified_check"
  CHECK ("verificationStatus" = 'PENDING_VERIFICATION'
         OR ("legalName" IS NOT NULL AND "gstin" IS NOT NULL AND "stateCode" IS NOT NULL
             AND "registeredAddress" IS NOT NULL
             AND "verifiedBy" IS NOT NULL AND "verifiedAt" IS NOT NULL)),
  -- The engine cannot tell intra-state from inter-state without the supplier's state.
  ADD CONSTRAINT "gst_business_profile_engine_needs_state_check"
  CHECK ("engineMode" = 'OFF' OR ("gstin" IS NOT NULL AND "stateCode" IS NOT NULL)),
  ADD CONSTRAINT "gst_business_profile_enforce_check"
  CHECK ("engineMode" <> 'ENFORCE'
         OR ("verificationStatus" = 'VERIFIED'
             AND "enforceApprovedBy" IS NOT NULL AND "enforceApprovedAt" IS NOT NULL));

-- =========================================================================
-- Calculation audits
-- =========================================================================

ALTER TABLE "gst_calculation_audits"
  ADD CONSTRAINT "gst_calculation_audits_mode_check"
  CHECK ("mode" <> 'OFF'),
  ADD CONSTRAINT "gst_calculation_audits_nonnegative_check"
  CHECK ("taxableCents" >= 0 AND "cgstCents" >= 0 AND "sgstCents" >= 0
         AND "igstCents" >= 0 AND "cessCents" >= 0),
  ADD CONSTRAINT "gst_calculation_audits_total_check"
  CHECK ("totalTaxCents" = "cgstCents" + "sgstCents" + "igstCents" + "cessCents"),
  -- An intra-state supply carries CGST + SGST; an inter-state one carries IGST.
  ADD CONSTRAINT "gst_calculation_audits_supply_check"
  CHECK (("supplyType" IS DISTINCT FROM 'INTRA_STATE' OR "igstCents" = 0)
         AND ("supplyType" IS DISTINCT FROM 'INTER_STATE' OR ("cgstCents" = 0 AND "sgstCents" = 0))),
  ADD CONSTRAINT "gst_calculation_audits_difference_check"
  CHECK (("legacyTaxCents" IS NULL) = ("differenceCents" IS NULL)
         AND ("legacyTaxCents" IS NULL
              OR "differenceCents" = "totalTaxCents" - "legacyTaxCents")),
  ADD CONSTRAINT "gst_calculation_audits_outcome_check"
  CHECK (("outcome" <> 'MATCHED' OR COALESCE("differenceCents", 0) = 0)
         AND ("outcome" <> 'MISSING_MAPPING' OR "missingMappings" IS NOT NULL)
         AND ("outcome" <> 'ERROR' OR "errorMessage" IS NOT NULL));

-- Finds the audits that rely on a rate version.
CREATE INDEX "gst_calculation_audits_rateVersionIds_idx"
  ON "gst_calculation_audits" USING GIN ("rateVersionIds");

-- =========================================================================
-- Rates cannot overlap while approved
-- =========================================================================

CREATE FUNCTION "gst_rate_master_no_overlap"() RETURNS trigger
LANGUAGE plpgsql AS $fn$
DECLARE
  code_id text;
BEGIN
  IF NEW."approval" <> 'APPROVED' THEN
    RETURN NEW;
  END IF;
  code_id := COALESCE(NEW."hsnId", NEW."sacId");
  -- Malformed rows are rejected by their CHECK constraints, with clearer messages.
  IF code_id IS NULL
     OR (NEW."effectiveTo" IS NOT NULL AND NEW."effectiveTo" < NEW."effectiveFrom")
     OR (NEW."minUnitValueCents" IS NOT NULL AND NEW."maxUnitValueCents" IS NOT NULL
         AND NEW."minUnitValueCents" > NEW."maxUnitValueCents") THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('gst_rate_master:' || code_id, 0));

  IF EXISTS (
    SELECT 1 FROM "gst_rate_master" r
     WHERE r."id" <> NEW."id"
       AND r."approval" = 'APPROVED'
       AND COALESCE(r."hsnId", r."sacId") = code_id
       AND daterange(r."effectiveFrom", r."effectiveTo", '[]')
           && daterange(NEW."effectiveFrom", NEW."effectiveTo", '[]')
       AND int8range(COALESCE(r."minUnitValueCents", 0)::bigint,
                     COALESCE(r."maxUnitValueCents", 9000000000000)::bigint, '[]')
           && int8range(COALESCE(NEW."minUnitValueCents", 0)::bigint,
                        COALESCE(NEW."maxUnitValueCents", 9000000000000)::bigint, '[]')
  ) THEN
    RAISE EXCEPTION 'An approved GST rate already covers this code for an overlapping period and value band'
      USING ERRCODE = 'exclusion_violation';
  END IF;
  RETURN NEW;
END
$fn$;

CREATE TRIGGER "gst_rate_master_b_no_overlap"
  BEFORE INSERT OR UPDATE ON "gst_rate_master"
  FOR EACH ROW EXECUTE FUNCTION "gst_rate_master_no_overlap"();

-- Verified mappings cannot overlap for the same piece, variant or charge.
CREATE FUNCTION "gst_product_mappings_no_overlap"() RETURNS trigger
LANGUAGE plpgsql AS $fn$
DECLARE
  scope_key text;
BEGIN
  IF NEW."status" <> 'VERIFIED' THEN
    RETURN NEW;
  END IF;
  IF NEW."effectiveTo" IS NOT NULL AND NEW."effectiveTo" < NEW."effectiveFrom" THEN
    RETURN NEW;
  END IF;
  scope_key := NEW."chargeKind"::text || ':' || COALESCE(NEW."productId", '')
               || ':' || COALESCE(NEW."variantId", '');

  PERFORM pg_advisory_xact_lock(hashtextextended('gst_product_mappings:' || scope_key, 0));

  IF EXISTS (
    SELECT 1 FROM "gst_product_mappings" m
     WHERE m."id" <> NEW."id"
       AND m."status" = 'VERIFIED'
       AND m."chargeKind" = NEW."chargeKind"
       AND m."productId" IS NOT DISTINCT FROM NEW."productId"
       AND m."variantId" IS NOT DISTINCT FROM NEW."variantId"
       AND daterange(m."effectiveFrom", m."effectiveTo", '[]')
           && daterange(NEW."effectiveFrom", NEW."effectiveTo", '[]')
  ) THEN
    RAISE EXCEPTION 'A verified GST classification already covers this item for an overlapping period'
      USING ERRCODE = 'exclusion_violation';
  END IF;
  RETURN NEW;
END
$fn$;

CREATE TRIGGER "gst_product_mappings_no_overlap"
  BEFORE INSERT OR UPDATE ON "gst_product_mappings"
  FOR EACH ROW EXECUTE FUNCTION "gst_product_mappings_no_overlap"();

-- =========================================================================
-- A used rate is history
-- =========================================================================

-- Once a calculation has relied on a rate, only two things may change: it may
-- be closed (effectiveTo set once, and not before the last calculation that
-- used it), and its notes edited. Everything else is a new rate version.
CREATE FUNCTION "gst_rate_master_guard_update"() RETURNS trigger
LANGUAGE plpgsql AS $fn$
BEGIN
  IF OLD."firstUsedAt" IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW."firstUsedAt"    IS DISTINCT FROM OLD."firstUsedAt"
     OR NEW."hsnId"       IS DISTINCT FROM OLD."hsnId"
     OR NEW."sacId"       IS DISTINCT FROM OLD."sacId"
     OR NEW."rateBps"     IS DISTINCT FROM OLD."rateBps"
     OR NEW."cgstBps"     IS DISTINCT FROM OLD."cgstBps"
     OR NEW."sgstBps"     IS DISTINCT FROM OLD."sgstBps"
     OR NEW."igstBps"     IS DISTINCT FROM OLD."igstBps"
     OR NEW."cessBps"     IS DISTINCT FROM OLD."cessBps"
     OR NEW."minUnitValueCents" IS DISTINCT FROM OLD."minUnitValueCents"
     OR NEW."maxUnitValueCents" IS DISTINCT FROM OLD."maxUnitValueCents"
     OR NEW."effectiveFrom" IS DISTINCT FROM OLD."effectiveFrom"
     OR NEW."notificationId" IS DISTINCT FROM OLD."notificationId"
     OR NEW."approval"    IS DISTINCT FROM OLD."approval"
     OR NEW."approvedBy"  IS DISTINCT FROM OLD."approvedBy"
     OR NEW."approvedAt"  IS DISTINCT FROM OLD."approvedAt" THEN
    RAISE EXCEPTION 'GST rate % has been used in a calculation and cannot be changed; close it and add a new rate version', OLD."id"
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW."effectiveTo" IS DISTINCT FROM OLD."effectiveTo" THEN
    IF OLD."effectiveTo" IS NOT NULL THEN
      RAISE EXCEPTION 'GST rate % has already been closed; its end date cannot be changed', OLD."id"
        USING ERRCODE = 'check_violation';
    END IF;
    IF EXISTS (
      SELECT 1 FROM "gst_calculation_audits" a
       WHERE OLD."id" = ANY (a."rateVersionIds")
         AND (a."calculatedAt" AT TIME ZONE 'Asia/Kolkata')::date > NEW."effectiveTo"
    ) THEN
      RAISE EXCEPTION 'GST rate % was used in a calculation after the proposed end date', OLD."id"
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END
$fn$;

CREATE TRIGGER "gst_rate_master_a_guard_update"
  BEFORE UPDATE ON "gst_rate_master"
  FOR EACH ROW EXECUTE FUNCTION "gst_rate_master_guard_update"();

CREATE FUNCTION "gst_rate_master_guard_delete"() RETURNS trigger
LANGUAGE plpgsql AS $fn$
BEGIN
  IF OLD."firstUsedAt" IS NOT NULL THEN
    RAISE EXCEPTION 'GST rate % has been used in a calculation and cannot be deleted', OLD."id"
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN OLD;
END
$fn$;

CREATE TRIGGER "gst_rate_master_guard_delete"
  BEFORE DELETE ON "gst_rate_master"
  FOR EACH ROW EXECUTE FUNCTION "gst_rate_master_guard_delete"();

-- A notification that a used rate rests on keeps its reference details.
CREATE FUNCTION "gst_notifications_guard_update"() RETURNS trigger
LANGUAGE plpgsql AS $fn$
BEGIN
  IF (NEW."number"        IS DISTINCT FROM OLD."number"
      OR NEW."title"      IS DISTINCT FROM OLD."title"
      OR NEW."issuedOn"   IS DISTINCT FROM OLD."issuedOn"
      OR NEW."effectiveFrom" IS DISTINCT FROM OLD."effectiveFrom"
      OR NEW."authority"  IS DISTINCT FROM OLD."authority"
      OR NEW."sourceUrl"  IS DISTINCT FROM OLD."sourceUrl")
     AND EXISTS (SELECT 1 FROM "gst_rate_master" r
                  WHERE r."notificationId" = OLD."id" AND r."firstUsedAt" IS NOT NULL) THEN
    RAISE EXCEPTION 'Notification % supports a GST rate that has been used and its details cannot be changed', OLD."id"
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END
$fn$;

CREATE TRIGGER "gst_notifications_guard_update"
  BEFORE UPDATE ON "gst_notifications"
  FOR EACH ROW EXECUTE FUNCTION "gst_notifications_guard_update"();

-- An HSN or SAC code that a used rate is filed under keeps its code.
CREATE FUNCTION "gst_hsn_master_guard_update"() RETURNS trigger
LANGUAGE plpgsql AS $fn$
BEGIN
  IF NEW."code" IS DISTINCT FROM OLD."code"
     AND EXISTS (SELECT 1 FROM "gst_rate_master" r
                  WHERE r."hsnId" = OLD."id" AND r."firstUsedAt" IS NOT NULL) THEN
    RAISE EXCEPTION 'HSN % is used by a GST rate that has been used and its code cannot be changed', OLD."id"
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END
$fn$;

CREATE TRIGGER "gst_hsn_master_guard_update"
  BEFORE UPDATE ON "gst_hsn_master"
  FOR EACH ROW EXECUTE FUNCTION "gst_hsn_master_guard_update"();

CREATE FUNCTION "gst_sac_master_guard_update"() RETURNS trigger
LANGUAGE plpgsql AS $fn$
BEGIN
  IF NEW."code" IS DISTINCT FROM OLD."code"
     AND EXISTS (SELECT 1 FROM "gst_rate_master" r
                  WHERE r."sacId" = OLD."id" AND r."firstUsedAt" IS NOT NULL) THEN
    RAISE EXCEPTION 'SAC % is used by a GST rate that has been used and its code cannot be changed', OLD."id"
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END
$fn$;

CREATE TRIGGER "gst_sac_master_guard_update"
  BEFORE UPDATE ON "gst_sac_master"
  FOR EACH ROW EXECUTE FUNCTION "gst_sac_master_guard_update"();

-- =========================================================================
-- First use of a rate is recorded, atomically, with the calculation
-- =========================================================================

-- Runs inside the transaction that inserts the audit row, so if the audit is
-- rolled back the stamp goes with it. The rates are locked first: an
-- administrator editing one at the same moment either finishes before this
-- reads it, or waits and then finds it already in use.
CREATE FUNCTION "gst_calculation_audits_mark_rates_used"() RETURNS trigger
LANGUAGE plpgsql AS $fn$
DECLARE
  wanted   integer;
  found    integer;
  approved integer;
BEGIN
  IF NEW."rateVersionIds" IS NULL OR cardinality(NEW."rateVersionIds") = 0 THEN
    RETURN NEW;
  END IF;

  SELECT count(DISTINCT x) INTO wanted FROM unnest(NEW."rateVersionIds") AS x;

  SELECT count(*), count(*) FILTER (WHERE r."approval" = 'APPROVED')
    INTO found, approved
    FROM (SELECT "approval" FROM "gst_rate_master"
           WHERE "id" = ANY (NEW."rateVersionIds") FOR UPDATE) r;

  IF found <> wanted THEN
    RAISE EXCEPTION 'A calculation refers to a GST rate that does not exist'
      USING ERRCODE = 'foreign_key_violation';
  END IF;
  IF approved <> found THEN
    RAISE EXCEPTION 'A calculation refers to a GST rate that is not approved'
      USING ERRCODE = 'check_violation';
  END IF;

  UPDATE "gst_rate_master"
     SET "firstUsedAt" = now()
   WHERE "id" = ANY (NEW."rateVersionIds") AND "firstUsedAt" IS NULL;
  RETURN NEW;
END
$fn$;

CREATE TRIGGER "gst_calculation_audits_mark_rates_used"
  AFTER INSERT ON "gst_calculation_audits"
  FOR EACH ROW EXECUTE FUNCTION "gst_calculation_audits_mark_rates_used"();
