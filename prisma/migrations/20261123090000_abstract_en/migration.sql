-- The abstract in English, shown when the OPAC is in English (CDI request).
-- Nullable: the French abstract stands in until one is written.
ALTER TABLE "bibliographic_records" ADD COLUMN "abstract_en" TEXT;
