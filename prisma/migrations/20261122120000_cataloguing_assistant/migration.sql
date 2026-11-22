-- Cataloguing assistant (docs/18-author-enrichment.md).

-- Identifiers that make "is this the same author?" certain. Unique: two
-- authorities holding the same one would be the same person filed twice.
ALTER TABLE "authors" ADD COLUMN "openlibrary_key" TEXT;
ALTER TABLE "authors" ADD COLUMN "wikidata_id" TEXT;
CREATE UNIQUE INDEX "authors_openlibrary_key_key" ON "authors"("openlibrary_key");
CREATE UNIQUE INDEX "authors_wikidata_id_key" ON "authors"("wikidata_id");

-- Every paid Gemini request, with its answer: the cache that stops the same
-- question being paid for twice, the count behind the daily cap, and a log
-- of what the assistant cost.
CREATE TABLE "ai_requests" (
    "id" SERIAL NOT NULL,
    "kind" TEXT NOT NULL,
    "input_hash" TEXT NOT NULL,
    "staff_user_id" INTEGER,
    "model" TEXT NOT NULL,
    "grounded" BOOLEAN NOT NULL,
    "prompt_tokens" INTEGER NOT NULL DEFAULT 0,
    "output_tokens" INTEGER NOT NULL DEFAULT 0,
    "response" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_requests_kind_input_hash_idx" ON "ai_requests"("kind", "input_hash");
CREATE INDEX "ai_requests_created_at_idx" ON "ai_requests"("created_at");

ALTER TABLE "ai_requests" ADD CONSTRAINT "ai_requests_staff_user_id_fkey"
    FOREIGN KEY ("staff_user_id") REFERENCES "staff_users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
