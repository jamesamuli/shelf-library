-- The copy set aside for a hold. Legacy carried this as resa.resa_cb, a
-- barcode string with no foreign key; here it is a real reference, so a copy
-- cannot be deleted out from under a waiting reader.
ALTER TABLE "holds" ADD COLUMN "item_id" INTEGER;

CREATE INDEX "holds_item_id_idx" ON "holds"("item_id");

ALTER TABLE "holds" ADD CONSTRAINT "holds_item_id_fkey"
    FOREIGN KEY ("item_id") REFERENCES "items"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Legacy resa_ranger: copies that were pulled off the shelf for a hold whose
-- hold has since gone away, and which therefore have to be physically put
-- back. A worklist, cleared by scanning the barcode.
CREATE TABLE "reshelving_items" (
    "id" SERIAL NOT NULL,
    "item_id" INTEGER NOT NULL,
    "flagged_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reshelving_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "reshelving_items_item_id_key" ON "reshelving_items"("item_id");

ALTER TABLE "reshelving_items" ADD CONSTRAINT "reshelving_items_item_id_fkey"
    FOREIGN KEY ("item_id") REFERENCES "items"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
