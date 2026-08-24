-- Rename the GIN indexes to the names Prisma derives from the schema, so a
-- drift check (`migrate diff --from-config-datasource --to-schema`) reports
-- only the one difference that cannot be expressed in Prisma: the GENERATED
-- expression, which Prisma reads as a column DEFAULT.
ALTER INDEX "bibliographic_records_search_idx" RENAME TO "bibliographic_records_search_vector_idx";
ALTER INDEX "authors_search_idx" RENAME TO "authors_search_vector_idx";
ALTER INDEX "subject_labels_search_idx" RENAME TO "subject_labels_search_vector_idx";
