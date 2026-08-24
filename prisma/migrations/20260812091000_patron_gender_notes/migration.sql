-- Legacy empr_sexe (tinyint 0/1/2). Stored as 'F'/'M'/NULL rather than an
-- enum: it is display-only data with no behaviour attached, and a nullable
-- text column does not need a migration the day a third value is wanted.
ALTER TABLE "patrons" ADD COLUMN "gender" TEXT;

-- Legacy empr_msg: free-form note the librarian sees on the reader's file.
ALTER TABLE "patrons" ADD COLUMN "notes" TEXT;
