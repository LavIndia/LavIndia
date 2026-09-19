# Per-unit serial tracking — reserved design

**Status: not implemented.** This note records the design the current code
leaves room for, so that adding it later is an additive change rather than a
redefinition of what an inventory item is.

## Why it is reserved rather than built

Jewellery systems generally track high-value pieces individually: each
physical unit carries its own certificate, appraisal, metal purity, stone
grade and supplier lot. Two visually identical rings can differ in ways that
matter for pricing and insurance, and a customer buying a certified stone
expects to know *which* stone they bought.

LavIndia does not need that today, and building it now would mean supplier
lots and goods-receipt lines, which the brief explicitly defers. But the cost
of adding it later is not in the new tables — it is in the fact that every
domain currently identifies an item as *(variant, quantity)*. Changing that
after POS, checkout and invoices are all written would touch all of them.

So the boundary was shaped to absorb it.

## What already exists for it

**`ProductVariant.trackingMode`** (`QUANTITY` | `SERIAL`, defaults to
`QUANTITY`). A piece can be declared one-of-a-kind today, which the admin
screens can already act on, without any per-unit machinery behind it.

**`StockLine.serialNumbers?: readonly string[]`.** Declared on the contract
every stock operation already takes. Supplying it today is **rejected** with
`SERIAL_TRACKING_UNSUPPORTED` rather than ignored — a silently dropped serial
would leave the caller believing a specific piece was tracked when it was not.

**The ledger.** `InventoryMovement` is already append-only and already records
before/after quantities per variant, per location, with a reference. Per-unit
movements slot in beside it rather than replacing it.

## What implementing it would add

A new model, owned by this module:

    InventoryItem
      id, variantId, locationId
      serialNumber      unique, scannable, distinct from the variant barcode
      status            IN_STOCK | RESERVED | SOLD | RETURNED | DAMAGED
      certificateNumber, certificateUrl
      metalPurity, stoneGrade, grossWeightMg, netWeightMg
      acquiredAt, acquisitionCostCents
      soldOrderId

`InventoryLevel` stays. For a `SERIAL` variant its `quantity` becomes a
derived count of `IN_STOCK` items rather than an independently maintained
number, so every existing read — the stock screen, availability checks, the
POS — keeps working untouched.

## The changes it would require

1. **`coalesceLines`** must stop merging lines that carry distinct units.
   Only quantity-tracked lines are interchangeable. A note to this effect sits
   in `stock/stock-lines.ts`.

2. **`mutateLevel`** keeps its conditional-UPDATE guard for quantity
   variants. Serial variants instead claim a specific row:
   `UPDATE inventory_items SET status = 'SOLD' WHERE id = $1 AND status = 'IN_STOCK'`
   — the same single-statement, race-free pattern, applied per unit.

3. **`OrderItem`** gains a serial snapshot alongside the SKU and barcode it
   already freezes, so an old invoice can name the exact piece.

4. **POS and checkout** pass `serialNumbers` on the line they already build.
   The validation that rejects it today becomes the branch that handles it.

## What must not change

The public contract. `InventoryPort` should not grow serial-specific methods:
a caller asks to sell *this line*, and the module decides how that line is
satisfied. Anything else leaks the tracking mode into every consumer and
undoes the isolation this module exists to provide.
