# Target schema — PostgreSQL

Proposal only. Nothing is migrated and no database exists yet; see
[06-legacy-data-model.md](06-legacy-data-model.md) for what this is
replacing. Prisma implementation: `prisma/schema.prisma`.

## Scope

Covers the domains needed for roadmap phases 1–3 (catalog, authorities,
items, patrons, circulation, staff/ACL). **Deliberately excluded** for
now: acquisitions, subscription management, CMS, events, digital
documents, connectors — see [05-roadmap.md](05-roadmap.md). They get
modeled when scheduled, not speculatively.

## Naming rules

- English throughout. No French, no abbreviations (`empr` → `patron`,
  `expl` → `item`, `cb` → `barcode`, `notice` → `bibliographic_record`).
- Tables `snake_case` plural; columns `snake_case`; Prisma models
  `PascalCase` singular, mapped with `@@map` / `@map`.
- Primary keys are `id`. Foreign keys are `<entity>_id`.
- Timestamps `created_at` / `updated_at` on every mutable entity.
- Booleans read as assertions: `is_visible_in_opac`, `allows_loan`.
- No table is named `status` alone — it is always qualified
  (`item_statuses`, `record_statuses`, `patron_statuses`).

## Structural decisions

**1. Real foreign keys, everywhere.** Every relationship from the legacy
analysis becomes an actual `REFERENCES` with an explicit `ON DELETE`
rule. This is the single biggest correctness gain over legacy.

**2. `NULL` instead of `0` sentinels.** Optional relationships are
nullable FKs. There is no "id 0 means none" convention.

**3. Loans become an append-only ledger.** One `loans` table with its own
`id`, a nullable `returned_at`, and no separate archive table. "Active
loan" is `returned_at IS NULL`. A partial unique index enforces one
active loan per item:

```sql
CREATE UNIQUE INDEX one_active_loan_per_item
  ON loans (item_id) WHERE returned_at IS NULL;
```

This replaces legacy's item-id-as-primary-key hack *and* deletes the
denormalized `pret_archive` snapshot entirely. Holds get the same
treatment via a `status` enum instead of a `resa_archive` table.

*Trade-off:* legacy kept patron demographics on archived loans so
statistics survived patron deletion. We keep the FK and **anonymize
rather than delete** patrons (`ON DELETE RESTRICT`, plus an
`anonymized_at` column) — history stays queryable without duplicating
columns.

**4. EAV replaced by JSONB + a definition table.** `custom_field_values`
disappears. Entities carry a `custom_fields jsonb NOT NULL DEFAULT '{}'`
column, and `custom_field_definitions` records what an admin declared
(entity, key, label, data type, required, ordering). Removes ~60 tables;
`jsonb_path_ops` GIN indexes keep it queryable. Validation lives in
application code at the write boundary.

**5. Search moves out of the entity tables.** Every `index_*` column and
the `mots` / `notices_mots_global_index` triad are dropped. Full-text
search uses a generated `tsvector` column plus a GIN index, e.g.:

```sql
ALTER TABLE bibliographic_records ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('french', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('french', coalesce(abstract, '')), 'B')
  ) STORED;
CREATE INDEX ON bibliographic_records USING GIN (search_vector);
```

Generated columns cannot drift from their source — the legacy index's
main failure mode is designed out. Prisma models this as
`Unsupported("tsvector")?`; the index is added in a migration.

**6. Fixed-arity columns become relations.** `tit1..tit4` become named
columns only where they are genuinely distinct concepts (`title`,
`parallel_title`, `subtitle`); `ed1_id`/`ed2_id` become a
`record_publishers` join table with a role, so a third publisher is just
another row.

**7. `users` is split.** Legacy's ~100-column table becomes
`staff_users` (identity, auth, activity) plus a `preferences jsonb`
column for UI/cataloging defaults, which are not relational data.

**8. Permissions become queryable.** The `rights` bitmask and BLOB ACL
rules are replaced by `roles` and a `role_permissions` table holding
string permission keys (`catalog.record.edit`). "Who can do X" becomes a
join.

**9. Correct types.** `numeric(10,2)` for money, `date`/`timestamptz` for
dates (no `0000-00-00`), `text` for URLs, `citext`-style case-insensitive
uniqueness via a unique index on `lower(...)`, UTF-8 throughout
(PostgreSQL has no `utf8` vs `utf8mb4` split).

## Concept mapping

| Legacy | Target |
|---|---|
| `notices` | `bibliographic_records` |
| `notices.niveau_biblio` | `bibliographic_level` enum (ANALYTIC / MONOGRAPH / SERIAL / BULLETIN) |
| `notices.niveau_hierar` | `hierarchic_level` enum (STANDALONE / PARENT / CHILD) |
| `exemplaires` | `items` |
| `bulletins` | `issues` |
| `responsability` | `contributions` (own `id` PK, UNIMARC `relator_code` kept) |
| `authors` + `author_type` | `authors` + `author_type` enum (PERSON / CORPORATE_BODY / CONGRESS) |
| `collections` + `sub_collections` | `collections` (self-referential — legacy already had `collection_parent`) |
| `noeuds` + `categories` | `subjects` + `subject_labels` (split preserved) |
| `notices_categories` | `record_subjects` |
| `indexint` | `classification_indexes` |
| `empr` | `patrons` |
| `pret` + `pret_archive` | `loans` (single table) |
| `resa` + `resa_archive` | `holds` (single table, status enum) |
| `docs_location` / `_section` / `_statut` / `_codestat` | `locations` / `sections` / `item_statuses` / `statistical_codes` |
| `empr_categ` / `empr_statut` | `patron_categories` / `patron_statuses` |
| `notice_statut` | `record_statuses` |
| `users` | `staff_users` (+ `preferences` jsonb) |
| `acces_profiles` / `acces_rights` / `users.rights` | `roles` / `role_permissions` |
| `*_custom*` (~60 tables) | `custom_field_definitions` + per-entity `custom_fields` jsonb |
| `mots`, `*_global_index`, `index_*` | generated `tsvector` + GIN |

## Deliberately not carried over

- The multi-thesaurus mechanism (`num_thesaurus`) — the CDI uses one.
- Per-language `categories` rows beyond a single UI language, until i18n
  is actually scheduled. The `subject_labels` split keeps the door open.
- `authperso` (admin-defined custom authority types) — the JSONB custom
  field mechanism covers the realistic cases.

## Open questions

1. **Is legacy data being migrated, or is this a fresh start?** Decides
   whether `barcode`/`isbn` need to tolerate legacy dirty values, and
   whether ID continuity matters. This is the main blocker on the data
   layer decision in [01-architecture.md](01-architecture.md).
2. **Do patrons authenticate against LDAP?** Legacy has `empr_ldap`.
   Affects whether `patrons` needs a password hash at all.
3. **Which of the ~20 `empr_statut.allow_*` flags does the CDI use?**
   Only the used ones should become columns.
4. **Are holds placed on a record or a specific item?** Legacy allows
   record-level (`resa_idnotice`), which the proposal keeps — worth
   confirming against actual CDI practice.
