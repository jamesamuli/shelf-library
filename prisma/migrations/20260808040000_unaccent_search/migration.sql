-- Accent-insensitive search.
--
-- Without this, "etranger" does not match "L'Étranger" — and typing French
-- without accents is normal, so the catalogue looked broken.
--
-- unaccent() is STABLE, not IMMUTABLE, so it cannot be called directly inside
-- a GENERATED column. The supported route is a text search configuration that
-- applies the unaccent dictionary before stemming: to_tsvector(regconfig, text)
-- *is* immutable, so generated columns can use it.

CREATE EXTENSION IF NOT EXISTS unaccent;

DROP TEXT SEARCH CONFIGURATION IF EXISTS french_unaccent;
CREATE TEXT SEARCH CONFIGURATION french_unaccent (COPY = french);
ALTER TEXT SEARCH CONFIGURATION french_unaccent
  ALTER MAPPING FOR hword, hword_part, word
  WITH unaccent, french_stem;

ALTER TABLE "bibliographic_records" DROP COLUMN "search_vector";
ALTER TABLE "bibliographic_records"
  ADD COLUMN "search_vector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('french_unaccent', coalesce("title", '')), 'A') ||
    setweight(to_tsvector('french_unaccent',
      coalesce("parallel_title", '') || ' ' || coalesce("subtitle", '')), 'B') ||
    setweight(to_tsvector('simple', coalesce("standard_number", '')), 'B') ||
    setweight(to_tsvector('french_unaccent',
      coalesce("abstract", '') || ' ' ||
      coalesce("general_note", '') || ' ' ||
      coalesce("content_note", '')), 'C')
  ) STORED;
CREATE INDEX "bibliographic_records_search_idx"
  ON "bibliographic_records" USING GIN ("search_vector");

ALTER TABLE "authors" DROP COLUMN "search_vector";
ALTER TABLE "authors"
  ADD COLUMN "search_vector" tsvector
  GENERATED ALWAYS AS (
    to_tsvector('french_unaccent',
      coalesce("name", '') || ' ' || coalesce("forename", ''))
  ) STORED;
CREATE INDEX "authors_search_idx" ON "authors" USING GIN ("search_vector");

ALTER TABLE "subject_labels" DROP COLUMN "search_vector";
ALTER TABLE "subject_labels"
  ADD COLUMN "search_vector" tsvector
  GENERATED ALWAYS AS (to_tsvector('french_unaccent', coalesce("label", ''))) STORED;
CREATE INDEX "subject_labels_search_idx"
  ON "subject_labels" USING GIN ("search_vector");
