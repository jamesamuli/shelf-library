-- Class groups for patrons. Legacy PMB filed this under empr_codestat, a
-- shared "statistical code" table; ours is its own table because a class is
-- how a CDI organises its whole population, not a reporting bucket, and
-- because the import needs a closed list to validate against.
CREATE TABLE "school_classes" (
    "id" SERIAL NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "school_classes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "school_classes_label_key" ON "school_classes"("label");

ALTER TABLE "patrons" ADD COLUMN "school_class_id" INTEGER;

CREATE INDEX "patrons_school_class_id_idx" ON "patrons"("school_class_id");

ALTER TABLE "patrons" ADD CONSTRAINT "patrons_school_class_id_fkey"
    FOREIGN KEY ("school_class_id") REFERENCES "school_classes"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- The school email is now the entry point for creating a reader, so it has to
-- be as unique as the barcode. Null stays allowed: readers imported from
-- elsewhere, or staff-created without one, are still valid.
CREATE UNIQUE INDEX "patrons_email_key" ON "patrons"("email");
