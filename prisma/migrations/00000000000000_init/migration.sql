-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "BibliographicLevel" AS ENUM ('ANALYTIC', 'MONOGRAPH', 'SERIAL', 'BULLETIN');

-- CreateEnum
CREATE TYPE "HierarchicLevel" AS ENUM ('STANDALONE', 'PARENT', 'CHILD');

-- CreateEnum
CREATE TYPE "AuthorType" AS ENUM ('PERSON', 'CORPORATE_BODY', 'CONGRESS');

-- CreateEnum
CREATE TYPE "ContributionLevel" AS ENUM ('PRIMARY', 'OTHER', 'SECONDARY');

-- CreateEnum
CREATE TYPE "HoldStatus" AS ENUM ('PENDING', 'AVAILABLE', 'FULFILLED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "CustomFieldDataType" AS ENUM ('TEXT', 'INTEGER', 'DECIMAL', 'BOOLEAN', 'DATE', 'SINGLE_CHOICE', 'MULTI_CHOICE');

-- CreateEnum
CREATE TYPE "CustomFieldEntity" AS ENUM ('BIBLIOGRAPHIC_RECORD', 'ITEM', 'PATRON', 'AUTHOR');

-- CreateTable
CREATE TABLE "bibliographic_records" (
    "id" SERIAL NOT NULL,
    "bibliographic_level" "BibliographicLevel" NOT NULL DEFAULT 'MONOGRAPH',
    "hierarchic_level" "HierarchicLevel" NOT NULL DEFAULT 'STANDALONE',
    "title" TEXT NOT NULL,
    "parallel_title" TEXT,
    "subtitle" TEXT,
    "standard_number" TEXT,
    "publication_year" INTEGER,
    "publication_date" DATE,
    "edition_statement" TEXT,
    "page_count" TEXT,
    "physical_details" TEXT,
    "dimensions" TEXT,
    "price" DECIMAL(10,2),
    "general_note" TEXT,
    "content_note" TEXT,
    "abstract" TEXT,
    "thumbnail_url" TEXT,
    "document_type_id" INTEGER,
    "status_id" INTEGER,
    "classification_index_id" INTEGER,
    "series_id" INTEGER,
    "collection_id" INTEGER,
    "parent_record_id" INTEGER,
    "volume_number" TEXT,
    "custom_fields" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bibliographic_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_types" (
    "id" SERIAL NOT NULL,
    "label" TEXT NOT NULL,
    "is_visible_in_opac" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "document_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "record_statuses" (
    "id" SERIAL NOT NULL,
    "label" TEXT NOT NULL,
    "opac_label" TEXT,
    "is_record_visible_in_opac" BOOLEAN NOT NULL DEFAULT true,
    "are_items_visible_in_opac" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "record_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "record_relations" (
    "id" SERIAL NOT NULL,
    "source_record_id" INTEGER NOT NULL,
    "target_record_id" INTEGER NOT NULL,
    "relation_type" TEXT NOT NULL,
    "rank" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "record_relations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "record_languages" (
    "record_id" INTEGER NOT NULL,
    "language_code" CHAR(3) NOT NULL,
    "rank" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "record_languages_pkey" PRIMARY KEY ("record_id","language_code")
);

-- CreateTable
CREATE TABLE "authors" (
    "id" SERIAL NOT NULL,
    "author_type" "AuthorType" NOT NULL DEFAULT 'PERSON',
    "name" TEXT NOT NULL,
    "forename" TEXT,
    "dates" TEXT,
    "isni" TEXT,
    "website" TEXT,
    "comment" TEXT,
    "see_also_id" INTEGER,
    "custom_fields" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "authors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contributions" (
    "id" SERIAL NOT NULL,
    "record_id" INTEGER NOT NULL,
    "author_id" INTEGER NOT NULL,
    "relator_code" VARCHAR(4) NOT NULL,
    "level" "ContributionLevel" NOT NULL DEFAULT 'PRIMARY',
    "rank" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "contributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publishers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT,
    "country" TEXT,
    "website" TEXT,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "publishers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "record_publishers" (
    "record_id" INTEGER NOT NULL,
    "publisher_id" INTEGER NOT NULL,
    "rank" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "record_publishers_pkey" PRIMARY KEY ("record_id","publisher_id")
);

-- CreateTable
CREATE TABLE "collections" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "issn" TEXT,
    "parent_id" INTEGER,

    CONSTRAINT "collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "series" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classification_indexes" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "comment" TEXT,

    CONSTRAINT "classification_indexes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subjects" (
    "id" SERIAL NOT NULL,
    "parent_id" INTEGER,
    "path" TEXT,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subject_labels" (
    "subject_id" INTEGER NOT NULL,
    "language_code" VARCHAR(5) NOT NULL,
    "label" TEXT NOT NULL,
    "scope_note" TEXT,
    "public_note" TEXT,

    CONSTRAINT "subject_labels_pkey" PRIMARY KEY ("subject_id","language_code")
);

-- CreateTable
CREATE TABLE "record_subjects" (
    "record_id" INTEGER NOT NULL,
    "subject_id" INTEGER NOT NULL,
    "heading_no" INTEGER NOT NULL DEFAULT 0,
    "rank" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "record_subjects_pkey" PRIMARY KEY ("record_id","subject_id","heading_no")
);

-- CreateTable
CREATE TABLE "items" (
    "id" SERIAL NOT NULL,
    "barcode" TEXT NOT NULL,
    "call_number" TEXT,
    "record_id" INTEGER,
    "issue_id" INTEGER,
    "location_id" INTEGER,
    "section_id" INTEGER,
    "status_id" INTEGER,
    "statistical_code_id" INTEGER,
    "price" DECIMAL(10,2),
    "note" TEXT,
    "acquired_on" DATE,
    "last_loan_at" TIMESTAMP(3),
    "custom_fields" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issues" (
    "id" SERIAL NOT NULL,
    "record_id" INTEGER NOT NULL,
    "number" TEXT NOT NULL,
    "title" TEXT,
    "date_label" TEXT,
    "issue_date" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" SERIAL NOT NULL,
    "label" TEXT NOT NULL,
    "is_visible_in_opac" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sections" (
    "id" SERIAL NOT NULL,
    "label" TEXT NOT NULL,
    "is_visible_in_opac" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_statuses" (
    "id" SERIAL NOT NULL,
    "label" TEXT NOT NULL,
    "opac_label" TEXT,
    "allows_loan" BOOLEAN NOT NULL DEFAULT true,
    "allows_hold" BOOLEAN NOT NULL DEFAULT false,
    "is_visible_in_opac" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "item_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "statistical_codes" (
    "id" SERIAL NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "statistical_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patrons" (
    "id" SERIAL NOT NULL,
    "barcode" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "first_name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address_line1" TEXT,
    "address_line2" TEXT,
    "postal_code" TEXT,
    "city" TEXT,
    "country" TEXT,
    "birth_year" INTEGER,
    "password_hash" TEXT,
    "login" TEXT,
    "category_id" INTEGER,
    "status_id" INTEGER,
    "location_id" INTEGER,
    "enrolled_on" DATE,
    "expires_on" DATE,
    "blocked_until" DATE,
    "anonymized_at" TIMESTAMP(3),
    "custom_fields" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patrons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patron_categories" (
    "id" SERIAL NOT NULL,
    "label" TEXT NOT NULL,
    "membership_duration_days" INTEGER NOT NULL DEFAULT 365,
    "membership_fee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "minimum_age" INTEGER,
    "maximum_age" INTEGER,
    "loan_quota" INTEGER,
    "loan_duration_days" INTEGER,

    CONSTRAINT "patron_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patron_statuses" (
    "id" SERIAL NOT NULL,
    "label" TEXT NOT NULL,
    "allows_loan" BOOLEAN NOT NULL DEFAULT true,
    "allows_hold" BOOLEAN NOT NULL DEFAULT true,
    "allows_renewal" BOOLEAN NOT NULL DEFAULT true,
    "allows_opac_login" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "patron_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loans" (
    "id" SERIAL NOT NULL,
    "item_id" INTEGER NOT NULL,
    "patron_id" INTEGER NOT NULL,
    "loaned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_on" DATE NOT NULL,
    "returned_at" TIMESTAMP(3),
    "renewal_count" INTEGER NOT NULL DEFAULT 0,
    "notice_level" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "holds" (
    "id" SERIAL NOT NULL,
    "patron_id" INTEGER NOT NULL,
    "record_id" INTEGER,
    "issue_id" INTEGER,
    "status" "HoldStatus" NOT NULL DEFAULT 'PENDING',
    "placed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_on" DATE,
    "resolved_at" TIMESTAMP(3),
    "pickup_location_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "holds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_users" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "first_name" TEXT,
    "email" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "preferences" JSONB NOT NULL DEFAULT '{}',
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" INTEGER NOT NULL,
    "permission" TEXT NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission")
);

-- CreateTable
CREATE TABLE "staff_user_roles" (
    "staff_user_id" INTEGER NOT NULL,
    "role_id" INTEGER NOT NULL,

    CONSTRAINT "staff_user_roles_pkey" PRIMARY KEY ("staff_user_id","role_id")
);

-- CreateTable
CREATE TABLE "custom_field_definitions" (
    "id" SERIAL NOT NULL,
    "entity" "CustomFieldEntity" NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "data_type" "CustomFieldDataType" NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "is_repeatable" BOOLEAN NOT NULL DEFAULT false,
    "is_searchable" BOOLEAN NOT NULL DEFAULT false,
    "rank" INTEGER NOT NULL DEFAULT 0,
    "choices" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_field_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bibliographic_records_title_idx" ON "bibliographic_records"("title");

-- CreateIndex
CREATE INDEX "bibliographic_records_standard_number_idx" ON "bibliographic_records"("standard_number");

-- CreateIndex
CREATE INDEX "bibliographic_records_bibliographic_level_idx" ON "bibliographic_records"("bibliographic_level");

-- CreateIndex
CREATE INDEX "record_relations_target_record_id_idx" ON "record_relations"("target_record_id");

-- CreateIndex
CREATE UNIQUE INDEX "record_relations_source_record_id_target_record_id_relation_key" ON "record_relations"("source_record_id", "target_record_id", "relation_type");

-- CreateIndex
CREATE INDEX "authors_name_idx" ON "authors"("name");

-- CreateIndex
CREATE INDEX "authors_author_type_idx" ON "authors"("author_type");

-- CreateIndex
CREATE INDEX "contributions_author_id_idx" ON "contributions"("author_id");

-- CreateIndex
CREATE UNIQUE INDEX "contributions_record_id_author_id_relator_code_level_key" ON "contributions"("record_id", "author_id", "relator_code", "level");

-- CreateIndex
CREATE INDEX "publishers_name_idx" ON "publishers"("name");

-- CreateIndex
CREATE INDEX "record_publishers_publisher_id_idx" ON "record_publishers"("publisher_id");

-- CreateIndex
CREATE INDEX "collections_name_idx" ON "collections"("name");

-- CreateIndex
CREATE INDEX "series_name_idx" ON "series"("name");

-- CreateIndex
CREATE UNIQUE INDEX "classification_indexes_code_key" ON "classification_indexes"("code");

-- CreateIndex
CREATE INDEX "subjects_parent_id_idx" ON "subjects"("parent_id");

-- CreateIndex
CREATE INDEX "subject_labels_label_idx" ON "subject_labels"("label");

-- CreateIndex
CREATE INDEX "record_subjects_subject_id_idx" ON "record_subjects"("subject_id");

-- CreateIndex
CREATE UNIQUE INDEX "items_barcode_key" ON "items"("barcode");

-- CreateIndex
CREATE INDEX "items_record_id_idx" ON "items"("record_id");

-- CreateIndex
CREATE INDEX "items_issue_id_idx" ON "items"("issue_id");

-- CreateIndex
CREATE INDEX "items_call_number_idx" ON "items"("call_number");

-- CreateIndex
CREATE INDEX "issues_record_id_idx" ON "issues"("record_id");

-- CreateIndex
CREATE UNIQUE INDEX "patrons_barcode_key" ON "patrons"("barcode");

-- CreateIndex
CREATE UNIQUE INDEX "patrons_login_key" ON "patrons"("login");

-- CreateIndex
CREATE INDEX "patrons_last_name_idx" ON "patrons"("last_name");

-- CreateIndex
CREATE INDEX "patrons_category_id_idx" ON "patrons"("category_id");

-- CreateIndex
CREATE INDEX "loans_item_id_idx" ON "loans"("item_id");

-- CreateIndex
CREATE INDEX "loans_patron_id_idx" ON "loans"("patron_id");

-- CreateIndex
CREATE INDEX "loans_due_on_idx" ON "loans"("due_on");

-- CreateIndex
CREATE INDEX "loans_returned_at_idx" ON "loans"("returned_at");

-- CreateIndex
CREATE INDEX "holds_patron_id_idx" ON "holds"("patron_id");

-- CreateIndex
CREATE INDEX "holds_record_id_idx" ON "holds"("record_id");

-- CreateIndex
CREATE INDEX "holds_status_idx" ON "holds"("status");

-- CreateIndex
CREATE UNIQUE INDEX "staff_users_username_key" ON "staff_users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE INDEX "role_permissions_permission_idx" ON "role_permissions"("permission");

-- CreateIndex
CREATE UNIQUE INDEX "custom_field_definitions_entity_key_key" ON "custom_field_definitions"("entity", "key");

-- AddForeignKey
ALTER TABLE "bibliographic_records" ADD CONSTRAINT "bibliographic_records_document_type_id_fkey" FOREIGN KEY ("document_type_id") REFERENCES "document_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bibliographic_records" ADD CONSTRAINT "bibliographic_records_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "record_statuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bibliographic_records" ADD CONSTRAINT "bibliographic_records_classification_index_id_fkey" FOREIGN KEY ("classification_index_id") REFERENCES "classification_indexes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bibliographic_records" ADD CONSTRAINT "bibliographic_records_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "series"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bibliographic_records" ADD CONSTRAINT "bibliographic_records_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "collections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bibliographic_records" ADD CONSTRAINT "bibliographic_records_parent_record_id_fkey" FOREIGN KEY ("parent_record_id") REFERENCES "bibliographic_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "record_relations" ADD CONSTRAINT "record_relations_source_record_id_fkey" FOREIGN KEY ("source_record_id") REFERENCES "bibliographic_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "record_relations" ADD CONSTRAINT "record_relations_target_record_id_fkey" FOREIGN KEY ("target_record_id") REFERENCES "bibliographic_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "record_languages" ADD CONSTRAINT "record_languages_record_id_fkey" FOREIGN KEY ("record_id") REFERENCES "bibliographic_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "authors" ADD CONSTRAINT "authors_see_also_id_fkey" FOREIGN KEY ("see_also_id") REFERENCES "authors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_record_id_fkey" FOREIGN KEY ("record_id") REFERENCES "bibliographic_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "authors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "record_publishers" ADD CONSTRAINT "record_publishers_record_id_fkey" FOREIGN KEY ("record_id") REFERENCES "bibliographic_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "record_publishers" ADD CONSTRAINT "record_publishers_publisher_id_fkey" FOREIGN KEY ("publisher_id") REFERENCES "publishers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collections" ADD CONSTRAINT "collections_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "collections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject_labels" ADD CONSTRAINT "subject_labels_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "record_subjects" ADD CONSTRAINT "record_subjects_record_id_fkey" FOREIGN KEY ("record_id") REFERENCES "bibliographic_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "record_subjects" ADD CONSTRAINT "record_subjects_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_record_id_fkey" FOREIGN KEY ("record_id") REFERENCES "bibliographic_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "item_statuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_statistical_code_id_fkey" FOREIGN KEY ("statistical_code_id") REFERENCES "statistical_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_record_id_fkey" FOREIGN KEY ("record_id") REFERENCES "bibliographic_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patrons" ADD CONSTRAINT "patrons_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "patron_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patrons" ADD CONSTRAINT "patrons_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "patron_statuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patrons" ADD CONSTRAINT "patrons_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_patron_id_fkey" FOREIGN KEY ("patron_id") REFERENCES "patrons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "holds" ADD CONSTRAINT "holds_patron_id_fkey" FOREIGN KEY ("patron_id") REFERENCES "patrons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "holds" ADD CONSTRAINT "holds_record_id_fkey" FOREIGN KEY ("record_id") REFERENCES "bibliographic_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "holds" ADD CONSTRAINT "holds_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "holds" ADD CONSTRAINT "holds_pickup_location_id_fkey" FOREIGN KEY ("pickup_location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_user_roles" ADD CONSTRAINT "staff_user_roles_staff_user_id_fkey" FOREIGN KEY ("staff_user_id") REFERENCES "staff_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_user_roles" ADD CONSTRAINT "staff_user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Constraints Prisma's schema language cannot express (see prisma/schema.prisma
-- header and docs/07-target-schema.md).

-- A copy is either on a bibliographic record or on a serial issue, never both
-- and never neither. Legacy expressed this as two int columns defaulting to 0.
ALTER TABLE "items"
  ADD CONSTRAINT "items_record_xor_issue"
  CHECK (("record_id" IS NULL) <> ("issue_id" IS NULL));

-- Replaces legacy's item-id-as-primary-key hack on `pret`: loans are an
-- append-only ledger, and at most one may be open per item at a time.
CREATE UNIQUE INDEX "one_active_loan_per_item"
  ON "loans" ("item_id") WHERE "returned_at" IS NULL;
