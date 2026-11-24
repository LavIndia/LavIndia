# GST product classification worksheet

All 18 catalog pieces are **NEEDS_PRODUCT_INFORMATION**. No material has been assumed and no HSN has been mapped
(`gst_product_mappings` holds 0 rows). Fill this in — or use the CSV on *Admin → GST → Classification → Download the sheet*,
which carries the same columns and previews before it saves.

For each piece record: base metal/material · plating (kind, thickness if known) · stones (natural / synthetic / glass /
crystal / none) · pearls (natural / cultured / imitation / none) · % by weight where known · the supplier invoice that proves it ·
who confirmed it.

The engine suggests candidate headings from what you enter; it never picks one from a name or price. The accountant
approves the heading. Candidate headings on record (all DRAFT, none approved): 7113 / 7116 / 7117 at 3% and 9101 / 9102 at 18%,
from Notification 9/2025-IGST (Rate); 7018 (other than imitation jewellery) at 18%. **Whether any of these applies to a piece is a
legal question for the accountant.**

| Category | Piece | Material | Plating | Stones | Pearls | Supplier invoice | Confirmed by | HSN (accountant) |
|---|---|---|---|---|---|---|---|---|
| Earrings | Disc Charm Huggie Earrings | | | | | | | |
| Earrings | Hammered Evil Eye Stud Earrings | | | | | | | |
| Earrings | Opal Cluster Huggie Earrings | | | | | | | |
| Earrings | Organza Flower Stud Earrings | | | | | | | |
| Earrings | Sparkle Chain Drape Earrings | | | | | | | |
| Earrings | Triple Band Hoop Earrings | | | | | | | |
| Earrings | Tulip and Pearl Drop Earrings | | | | | | | |
| Necklaces | Crystal Motif Pendant Necklace | | | | | | | |
| Necklaces | Emerald Cut Crystal Pendant | | | | | | | |
| Necklaces | Enamel Butterfly Choker | | | | | | | |
| Necklaces | Layered Butterfly Necklace | | | | | | | |
| Necklaces | Molten Drop Collar | | | | | | | |
| Necklaces | Mystic Heart Halo Pendant | | | | | | | |
| Necklaces | Onyx Tablet Pendant Necklace | | | | | | | |
| Necklaces | Petite Charm Pendant Necklace | | | | | | | |
| Necklaces | Puffed Heart Station Necklace | | | | | | | |
| Rings | Gold Wrap Ring | | | | | | | |
| Rings | Pavé Butterfly Ring | | | | | | | |

## Seen on the live shop, not in this catalog (pending import)

The live catalog itself has not been read (production is out of bounds). Recorded in `gst_pending_catalog_items`:

| Kind | Name | Note |
|---|---|---|
| Product | Earing pearl | as spelled on the live site |
| Product | Golden Feather Wings Statement Earrings | |
| Product | Gold Crystal Wing Statement Earrings | |
| Category | Bracelet | |
| Category | Watch | a watch is not jewellery; the heading is a separate question |

Export the live catalog, import it, then classify these like the rest.
