# GST — information only the business or its accountant can supply

Nothing below has been guessed or pre-filled. Each item blocks ENFORCE (the engine refuses) until answered.

## Business
- [ ] Legal name, trade name, **GSTIN**, registered address, **state** (as on the registration certificate). Then press *Verify* (format and checksum are checked; the state must equal the GSTIN's first two digits).
- [ ] Registration type (regular / composition) and effective date — a composition dealer cannot charge GST on invoices.
- [ ] Aggregate turnover band → HSN digits required (4 up to ₹5 crore, 6 above; B2C proviso, Notification 78/2020-CT).
- [ ] **E-invoicing**: does the shop's turnover make e-invoicing mandatory? Threshold and date unverified. If yes, the engine stays blocked — IRN generation is not built (fields and the readiness flag exist).
- [ ] Is the supplier state the dispatch state for online orders? (Place of supply follows the delivery state.)

## Accountant decisions (Admin → GST → Registration)
- [ ] Prices shown to customers: **inclusive or exclusive** of GST.
- [ ] **Delivery charges**: no GST / follows the goods / separate HSN-SAC and rate. Official rule not verified.
- [ ] **Cash-on-delivery fee**: same three options.
- [ ] Mixed baskets: share charges **proportionally** or at the **highest rate**.
- [ ] Rounding: the engine rounds half-up per line in paise; confirm that matches the books.

## Products (see CLASSIFICATION_WORKSHEET.md)
- [ ] Material, plating, stones and pearls for each of the 18 pieces, with the supplier invoice.
- [ ] Upload the supplier purchase invoices (PDF/JPG/PNG, ≤ 5 MB each).
- [ ] Accountant approval of each heading. The person who entered a piece's details cannot approve it.
- [ ] Live-shop pieces and categories (Earing pearl, Golden Feather Wings, Gold Crystal Wing, Bracelet, Watch): export and import.

## Rates and law
- [ ] Read the cited notification for each draft rate and mark it **verified**; then approve. Unverified evidence carried forward: the CT (Rate) twin of Notification 9/2025, the content of 01/2026, the Chapter 71 / 91 Notes, and the official rule for shipping/COD.
- [ ] Confirm which of 7113 / 7116 / 7117 / 7018 / 91xx (if any) applies to each piece — a legal determination, not a software one.

## Before ENFORCE
- [ ] At least 20 clean shadow calculations (engine and existing checkout agree, or each difference explained).
- [ ] Every sold piece Verified; no *Not classified* rows in Calculations.
