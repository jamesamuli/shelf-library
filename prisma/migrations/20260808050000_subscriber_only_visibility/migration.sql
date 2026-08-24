-- Subscriber-only OPAC visibility, mirroring legacy's
-- notice_statut.notice_visible_opac_abon / expl_visible_opac_abon.
--
-- These NARROW the master switch, they do not override it: a record is public
-- when is_record_visible_in_opac AND NOT is_record_subscriber_only, and
-- visible to signed-in patrons only when both are true.
ALTER TABLE "record_statuses"
  ADD COLUMN "is_record_subscriber_only" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "are_items_subscriber_only" BOOLEAN NOT NULL DEFAULT false;
