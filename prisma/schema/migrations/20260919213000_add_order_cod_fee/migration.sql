-- What the customer was charged for cash on delivery, in paise, recorded per
-- order so an invoice states the rate that was actually agreed.
ALTER TABLE "orders" ADD COLUMN "codFeeCents" INTEGER NOT NULL DEFAULT 0;
