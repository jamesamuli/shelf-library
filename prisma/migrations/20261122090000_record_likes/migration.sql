-- A reader's "J'aime" on a record (CDI request). One row per reader and
-- record: it is both the reader's favourites list and, counted, the record's
-- public tally. Legacy PMB has no equivalent; its closest is the OPAC basket.
CREATE TABLE "record_likes" (
    "patron_id" INTEGER NOT NULL,
    "record_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "record_likes_pkey" PRIMARY KEY ("patron_id","record_id")
);

-- Counting a record's likes reads by record; the reader's list by the key.
CREATE INDEX "record_likes_record_id_idx" ON "record_likes"("record_id");

-- Both cascade: a like means nothing once either side is gone, and an
-- anonymised reader keeps their row (anonymisation does not delete).
ALTER TABLE "record_likes" ADD CONSTRAINT "record_likes_patron_id_fkey"
    FOREIGN KEY ("patron_id") REFERENCES "patrons"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "record_likes" ADD CONSTRAINT "record_likes_record_id_fkey"
    FOREIGN KEY ("record_id") REFERENCES "bibliographic_records"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
