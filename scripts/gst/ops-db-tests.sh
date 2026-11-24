#!/bin/bash
# Database tests for the GST operations tables. Runs against a THROWAWAY database
# only (lavindia_ops_test), never the application database.
#
#   bash scripts/gst/ops-db-tests.sh <file containing the local DATABASE_URL>
PG="/c/Program Files/PostgreSQL/18/bin/psql"; U="$(cat "$1")"; T="${U%/*}/lavindia_ops_test"
case "$T" in *lavindia_ops_test) ;; *) echo "refusing: not the scratch DB"; exit 1;; esac
P=0; F=0
run() { "$PG" "$T" -v ON_ERROR_STOP=1 -q -At -c "$1" 2>&1 | tr -d '\r'; }
ok()  { out=$(run "BEGIN; $2; ROLLBACK;"); if echo "$out" | grep -qi "error"; then F=$((F+1)); echo "  FAIL  $1 -> rejected: $(echo "$out"|grep -i error|head -1|cut -c1-150)"; else P=$((P+1)); echo "  PASS  $1"; fi; }
bad() { out=$(run "BEGIN; $2; ROLLBACK;"); if echo "$out" | grep -qiE "$3"; then P=$((P+1)); echo "  PASS  $1  [rejected]"; else F=$((F+1)); echo "  FAIL  $1 -> expected /$3/ got: $(echo "$out"|head -2|cut -c1-160)"; fi; }

run 'TRUNCATE gst_credit_notes, gst_invoice_details, gst_classification_events, gst_supplier_documents, gst_product_profiles, gst_configuration, gst_rate_proposals, gst_source_watches, gst_return_reconciliations, gst_pending_catalog_items CASCADE' >/dev/null

# Scratch-only convenience: the tests do not bother to name a creator.
run "ALTER TABLE gst_credit_notes ALTER COLUMN \"createdBy\" SET DEFAULT 'tester'" >/dev/null

SUP='{"name":"Test Shop","gstin":"27AAPFU0939F1ZV","stateCode":"27"}'
INV="INSERT INTO gst_invoice_details(id,\"orderId\",\"invoiceNumber\",\"financialYear\",\"invoiceDate\",kind,supplier,recipient,\"supplierStateCode\",\"placeOfSupplyCode\",\"supplyType\",\"pricesIncludeTax\",lines,\"rateSummary\",\"taxableCents\",\"cgstCents\",\"sgstCents\",\"igstCents\",\"totalTaxCents\",\"invoiceValueCents\",\"updatedAt\")"
V1="VALUES ('i1','o1','INV/26-27/000001','26-27',now(),'B2C','$SUP','{}','27','27','INTRA_STATE',false,'[{\"lineId\":\"a\"}]','[]',100000,1500,1500,0,3000,103000,now())"
run "$INV $V1" >/dev/null

echo "== configuration"
ok  "an undecided configuration" "INSERT INTO gst_configuration(id,\"updatedAt\") VALUES ('c',now())"
bad "a decision without a decider" "INSERT INTO gst_configuration(id,\"shippingTreatment\",\"updatedAt\") VALUES ('c','NONE',now())" "decided_check"
bad "FOLLOWS_GOODS without a mixed-basket policy" "INSERT INTO gst_configuration(id,\"shippingTreatment\",\"treatmentApprovedBy\",\"treatmentApprovedAt\",\"updatedAt\") VALUES ('c','FOLLOWS_GOODS','acct',now(),now())" "policy_check"
ok  "a complete decision" "INSERT INTO gst_configuration(id,\"shippingTreatment\",\"codTreatment\",\"mixedBasketPolicy\",\"treatmentApprovedBy\",\"treatmentApprovedAt\",\"updatedAt\") VALUES ('c','FOLLOWS_GOODS','NONE','PROPORTIONAL','acct',now(),now())"
bad "a second configuration row" "INSERT INTO gst_configuration(id,\"updatedAt\") VALUES ('c1',now()); INSERT INTO gst_configuration(id,\"updatedAt\") VALUES ('c2',now())" "single_row"

echo "== product profiles and supplier papers"
ok  "a profile with nothing known" "INSERT INTO gst_product_profiles(id,\"productId\",\"updatedAt\") VALUES ('p','prod1',now())"
bad "COMPLETE without base metal and confirmation" "INSERT INTO gst_product_profiles(id,\"productId\",\"infoStatus\",\"updatedAt\") VALUES ('p','prod1','COMPLETE',now())" "complete_check"
bad "COMPLETE with plating still UNKNOWN" "INSERT INTO gst_product_profiles(id,\"productId\",\"infoStatus\",\"baseMetal\",\"confirmedBy\",\"confirmedAt\",\"updatedAt\") VALUES ('p','prod1','COMPLETE','brass','o',now(),now())" "complete_check"
ok  "a COMPLETE profile" "INSERT INTO gst_product_profiles(id,\"productId\",\"infoStatus\",\"baseMetal\",\"platingType\",\"confirmedBy\",\"confirmedAt\",\"updatedAt\") VALUES ('p','prod1','COMPLETE','brass','ELECTROPLATED','o',now(),now())"
bad "one profile per product" "INSERT INTO gst_product_profiles(id,\"productId\",\"updatedAt\") VALUES ('p1','prod1',now()); INSERT INTO gst_product_profiles(id,\"productId\",\"updatedAt\") VALUES ('p2','prod1',now())" "duplicate|unique"
bad "a supplier HSN that is not digits" "INSERT INTO gst_product_profiles(id,\"productId\",\"supplierHsn\",\"updatedAt\") VALUES ('p','prod1','71AB',now())" "supplier_hsn_check"
bad "gems that are not a list" "INSERT INTO gst_product_profiles(id,\"productId\",gems,\"updatedAt\") VALUES ('p','prod1','{\"a\":1}',now())" "gems_check"
DOC="INSERT INTO gst_supplier_documents(id,\"supplierName\",\"fileName\",\"mimeType\",\"sizeBytes\",sha256,content,\"uploadedBy\")"
H64="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
ok  "a valid supplier document" "$DOC VALUES ('d','S','a.pdf','application/pdf',3,'$H64','\\x010203','u')"
bad "a size that does not match the bytes" "$DOC VALUES ('d','S','a.pdf','application/pdf',9,'$H64','\\x010203','u')" "size_check"
bad "a file type outside pdf/jpeg/png" "$DOC VALUES ('d','S','a.exe','application/x-msdownload',3,'$H64','\\x010203','u')" "mime_check"
bad "a malformed checksum" "$DOC VALUES ('d','S','a.pdf','application/pdf',3,'xyz','\\x010203','u')" "sha256_check"
bad "swapping the bytes of an uploaded paper" "$DOC VALUES ('d','S','a.pdf','application/pdf',3,'$H64','\\x010203','u'); UPDATE gst_supplier_documents SET content='\\x040506' WHERE id='d'" "cannot be replaced"
ok  "editing a paper's notes" "$DOC VALUES ('d','S','a.pdf','application/pdf',3,'$H64','\\x010203','u'); UPDATE gst_supplier_documents SET notes='checked' WHERE id='d'"

echo "== classification trail"
EV="INSERT INTO gst_classification_events(id,\"productId\",action,\"actorId\",\"approverName\",reason)"
ok  "info saved" "$EV VALUES ('e','prod1','INFO_SAVED','u',NULL,NULL)"
bad "approval without the accountant's name" "$EV VALUES ('e','prod1','APPROVED','u',NULL,NULL)" "approved_check"
bad "rejection without a reason" "$EV VALUES ('e','prod1','REJECTED','u','Acct',NULL)" "rejected_check"
ok  "a reasoned rejection" "$EV VALUES ('e','prod1','REJECTED','u','Acct','stones are glass, not natural')"
bad "a submission with no product" "$EV VALUES ('e',NULL,'SUBMITTED','u',NULL,NULL)" "product_check"
bad "editing a trail entry" "$EV VALUES ('e','prod1','INFO_SAVED','u',NULL,NULL); UPDATE gst_classification_events SET reason='x' WHERE id='e'" "append-only"
bad "deleting a trail entry" "$EV VALUES ('e','prod1','INFO_SAVED','u',NULL,NULL); DELETE FROM gst_classification_events WHERE id='e'" "append-only"

echo "== GST invoice details"
ok  "the base invoice detail" "SELECT 1"
bad "tax that is not the sum of its heads" "$INV VALUES ('x','o2','INV/2','26-27',now(),'B2C','$SUP','{}','27','27','INTRA_STATE',false,'[{}]','[]',100000,1500,1500,0,2999,102999,now())" "total_tax_check"
bad "an invoice value that is not taxable + tax + untaxed" "$INV VALUES ('x','o2','INV/2','26-27',now(),'B2C','$SUP','{}','27','27','INTRA_STATE',false,'[{}]','[]',100000,1500,1500,0,3000,104000,now())" "value_check"
bad "IGST on an intra-state invoice" "$INV VALUES ('x','o2','INV/2','26-27',now(),'B2C','$SUP','{}','27','27','INTRA_STATE',false,'[{}]','[]',100000,0,0,3000,3000,103000,now())" "supply_check"
bad "intra-state but different states" "$INV VALUES ('x','o2','INV/2','26-27',now(),'B2C','$SUP','{}','27','29','INTRA_STATE',false,'[{}]','[]',100000,1500,1500,0,3000,103000,now())" "place_matches_supply"
ok  "an inter-state invoice with IGST" "$INV VALUES ('x','o2','INV/2','26-27',now(),'B2C','$SUP','{}','27','29','INTER_STATE',false,'[{}]','[]',100000,0,0,3000,3000,103000,now())"
bad "B2B without the buyer's GSTIN" "$INV VALUES ('x','o2','INV/2','26-27',now(),'B2B','$SUP','{}','27','27','INTRA_STATE',false,'[{}]','[]',100000,1500,1500,0,3000,103000,now())" "b2b_check"
bad "no valid supplier GSTIN" "$INV VALUES ('x','o2','INV/2','26-27',now(),'B2C','{\"gstin\":\"GST123456789\"}','{}','27','27','INTRA_STATE',false,'[{}]','[]',100000,1500,1500,0,3000,103000,now())" "supplier_gstin_check"
bad "an invoice with no lines" "$INV VALUES ('x','o2','INV/2','26-27',now(),'B2C','$SUP','{}','27','27','INTRA_STATE',false,'[]','[]',100000,1500,1500,0,3000,103000,now())" "lines_check"
bad "one detail per order" "$INV VALUES ('x','o1','INV/9','26-27',now(),'B2C','$SUP','{}','27','27','INTRA_STATE',false,'[{}]','[]',100000,1500,1500,0,3000,103000,now())" "duplicate|unique"
bad "changing an issued invoice's amounts" "UPDATE gst_invoice_details SET \"taxableCents\"=1 WHERE id='i1'" "cannot be changed"
bad "changing an issued invoice's lines" "UPDATE gst_invoice_details SET lines='[{\"lineId\":\"z\"}]' WHERE id='i1'" "cannot be changed"
bad "deleting an issued invoice detail" "DELETE FROM gst_invoice_details WHERE id='i1'" "cannot be deleted"
ok  "recording the e-invoice details afterwards" "UPDATE gst_invoice_details SET \"eInvoiceStatus\"='GENERATED',irn='IRN1',\"ackNumber\"='A1',\"ackDate\"=now() WHERE id='i1'"
bad "GENERATED without an IRN" "UPDATE gst_invoice_details SET \"eInvoiceStatus\"='GENERATED' WHERE id='i1'" "einvoice_check"
bad "changing an IRN once recorded" "UPDATE gst_invoice_details SET \"eInvoiceStatus\"='GENERATED',irn='IRN1',\"ackNumber\"='A1',\"ackDate\"=now() WHERE id='i1'; UPDATE gst_invoice_details SET irn='IRN2' WHERE id='i1'" "IRN of GST invoice"

echo "== GST credit notes (invoice i1: value 103000, taxable 100000, CGST 1500, SGST 1500)"
CN="INSERT INTO gst_credit_notes(id,\"creditNoteNumber\",\"invoiceDetailId\",\"orderId\",\"financialYear\",kind,reason,lines,\"taxableCents\",\"cgstCents\",\"sgstCents\",\"igstCents\",\"totalTaxCents\",\"refundCents\")"
ok  "a part credit note" "$CN VALUES ('n1','CN/26-27/000001','i1','o1','26-27','PARTIAL','one item returned','[{\"lineId\":\"a\"}]',50000,750,750,0,1500,51500)"
ok  "a credit note for the whole invoice" "$CN VALUES ('n1','CN/26-27/000001','i1','o1','26-27','FULL','cancelled','[{\"lineId\":\"a\"}]',100000,1500,1500,0,3000,103000)"
bad "refunding more than the invoice value" "$CN VALUES ('n1','CN/1','i1','o1','26-27','PARTIAL','x','[{}]',100000,1500,1500,0,3000,103001)" "more than the invoice"
bad "two credit notes together over the invoice" "$CN VALUES ('n1','CN/1','i1','o1','26-27','PARTIAL','x','[{}]',60000,900,900,0,1800,61800); $CN VALUES ('n2','CN/2','i1','o1','26-27','PARTIAL','x','[{}]',60000,900,900,0,1800,61800)" "more than the invoice"
bad "reversing more CGST than was charged" "$CN VALUES ('n1','CN/1','i1','o1','26-27','PARTIAL','x','[{}]',10000,1501,0,0,1501,11501)" "more than the invoice"
bad "tax not the sum of its heads" "$CN VALUES ('n1','CN/1','i1','o1','26-27','PARTIAL','x','[{}]',10000,100,100,0,199,10199)" "total_tax_check"
bad "a refund smaller than taxable + tax" "$CN VALUES ('n1','CN/1','i1','o1','26-27','PARTIAL','x','[{}]',10000,100,100,0,200,10100)" "refund_check"
bad "no reason" "$CN VALUES ('n1','CN/1','i1','o1','26-27','PARTIAL','  ','[{}]',10000,100,100,0,200,10200)" "reason_check"
bad "a credit note for an invoice that does not exist" "$CN VALUES ('n1','CN/1','ghost','o1','26-27','PARTIAL','x','[{}]',10000,100,100,0,200,10200)" "does not exist|foreign key"
bad "editing a credit note" "$CN VALUES ('n1','CN/1','i1','o1','26-27','PARTIAL','x','[{}]',10000,100,100,0,200,10200); UPDATE gst_credit_notes SET reason='y' WHERE id='n1'" "append-only"
bad "deleting a credit note" "$CN VALUES ('n1','CN/1','i1','o1','26-27','PARTIAL','x','[{}]',10000,100,100,0,200,10200); DELETE FROM gst_credit_notes WHERE id='n1'" "append-only"
bad "a duplicate credit note number" "$CN VALUES ('n1','CN/1','i1','o1','26-27','PARTIAL','x','[{}]',10000,100,100,0,200,10200); $CN VALUES ('n2','CN/1','i1','o1','26-27','PARTIAL','x','[{}]',10000,100,100,0,200,10200)" "duplicate|unique"

echo "== proposals, watches, reconciliations, pending items"
PR="INSERT INTO gst_rate_proposals(id,title,\"proposedChange\",status,\"reviewedBy\",\"reviewedAt\",\"reviewNote\",\"createdRateId\",\"createdBy\",\"updatedAt\")"
ok  "a new proposal" "$PR VALUES ('r','t','{}','PROPOSED',NULL,NULL,NULL,NULL,'u',now())"
bad "accepted with no reviewer" "$PR VALUES ('r','t','{}','ACCEPTED',NULL,NULL,NULL,'rate1','u',now())" "reviewed_check"
bad "accepted without the DRAFT rate it created" "$PR VALUES ('r','t','{}','ACCEPTED','a',now(),NULL,NULL,'u',now())" "accepted_check"
bad "rejected without a reason" "$PR VALUES ('r','t','{}','REJECTED','a',now(),NULL,NULL,'u',now())" "rejected_check"
bad "a proposal whose change is not an object" "$PR VALUES ('r','t','[]','PROPOSED',NULL,NULL,NULL,NULL,'u',now())" "change_check"
bad "a watched URL that is not https" "INSERT INTO gst_source_watches(id,label,url,\"createdBy\") VALUES ('w','l','http://x.test','u')" "url_check"
bad "a reconciliation period out of shape" "INSERT INTO gst_return_reconciliations(id,period,\"returnType\",entered,computed,differences,\"enteredBy\") VALUES ('x','2026-13','GSTR1','{}','{}','{}','u')" "period_check"
ok  "a reconciliation" "INSERT INTO gst_return_reconciliations(id,period,\"returnType\",entered,computed,differences,\"enteredBy\") VALUES ('x','2026-10','GSTR3B','{}','{}','{}','u')"
bad "a pending item marked IMPORTED with no product" "INSERT INTO gst_pending_catalog_items(id,kind,name,source,status,\"updatedAt\") VALUES ('x','PRODUCT','P','live','IMPORTED',now())" "imported_check"
bad "the same pending item twice" "INSERT INTO gst_pending_catalog_items(id,kind,name,source,\"updatedAt\") VALUES ('x','PRODUCT','P','live',now()); INSERT INTO gst_pending_catalog_items(id,kind,name,source,\"updatedAt\") VALUES ('y','PRODUCT','P','live',now())" "duplicate|unique"

echo "== concurrency: two refunds racing for the same invoice"
run "TRUNCATE gst_credit_notes" >/dev/null
for i in 1 2 3 4 5 6; do ( "$PG" "$T" -v ON_ERROR_STOP=1 -q -At -c "$CN VALUES ('race$i','CN/RACE/$i','i1','o1','26-27','PARTIAL','race','[{}]',30000,450,450,0,900,30900)" > "$(dirname "$1")/race$i.txt" 2>&1 ) & done
wait
n=$(run "SELECT count(*) FROM gst_credit_notes"); total=$(run "SELECT sum(\"refundCents\") FROM gst_credit_notes")
if [ "$n" = "3" ] && [ "$total" -le 103000 ]; then P=$((P+1)); echo "  PASS  6 refunds of 30,900 racing on a 103,000 invoice: exactly 3 accepted (total $total)"; else F=$((F+1)); echo "  FAIL  race: $n accepted, total $total"; fi
rm -f "$(dirname "$1")"/race*.txt

echo; echo "RESULT: $P passed, $F failed"
