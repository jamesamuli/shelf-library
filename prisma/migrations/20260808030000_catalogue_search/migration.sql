-- Full-text search for the public catalogue.
--
-- Replaces legacy's `words` dictionary + `notices_mots_global_index` + the
-- `index_*` columns. These are GENERATED columns, so they cannot drift from
-- the source data — which was the legacy index's main failure mode.
--
-- Weighting mirrors legacy's `pond`: title strongest, then secondary titles
-- and identifiers, then notes and abstract.

ALTER TABLE "bibliographic_records"
  ADD COLUMN "search_vector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('french', coalesce("title", '')), 'A') ||
    setweight(to_tsvector('french',
      coalesce("parallel_title", '') || ' ' || coalesce("subtitle", '')), 'B') ||
    setweight(to_tsvector('simple', coalesce("standard_number", '')), 'B') ||
    setweight(to_tsvector('french',
      coalesce("abstract", '') || ' ' ||
      coalesce("general_note", '') || ' ' ||
      coalesce("content_note", '')), 'C')
  ) STORED;

CREATE INDEX "bibliographic_records_search_idx"
  ON "bibliographic_records" USING GIN ("search_vector");

-- Authors and subjects are searched through their own indexed vectors rather
-- than joined text, so matching a heading stays index-backed.
ALTER TABLE "authors"
  ADD COLUMN "search_vector" tsvector
  GENERATED ALWAYS AS (
    to_tsvector('french', coalesce("name", '') || ' ' || coalesce("forename", ''))
  ) STORED;

CREATE INDEX "authors_search_idx" ON "authors" USING GIN ("search_vector");

ALTER TABLE "subject_labels"
  ADD COLUMN "search_vector" tsvector
  GENERATED ALWAYS AS (to_tsvector('french', coalesce("label", ''))) STORED;

CREATE INDEX "subject_labels_search_idx"
  ON "subject_labels" USING GIN ("search_vector");
