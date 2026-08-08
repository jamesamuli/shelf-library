# Database

## Legacy schema (reference only)

MySQL/MariaDB, no ORM, raw SQL via `classes/`/`Pmb/`. Full schema at
`../CDI_PROJECT/tables/bibli.sql` — **514 tables**. Too large to port
wholesale or to treat as a target schema; read it per-feature, when a
feature in that domain is actually being scoped.

### Domain groups (by table prefix)

| Domain | Key tables | Covers |
|---|---|---|
| Catalog | `notices`, `notices_*`, `categories`, `thesaurus`, `titres_uniformes` | Bibliographic records (UNIMARC-derived) |
| Authority control | `authorities`, `authors`, `publishers`, `series`, `authperso` | Names/subjects shared across records |
| Copies | `exemplaires`, `docs_location`, `docs_statut`, `docs_section` | Physical items tied to a `notice` |
| Patrons | `empr`, `empr_categ`, `empr_groupe`, `empr_statut` | Borrowers ("emprunteurs") |
| Circulation | `pret`, `pret_archive`, `resa`, `resa_archive` | Loans and reservations |
| Acquisitions | `budgets`, `paiements`, `entites`, `offres_remises`, `exercices` | Ordering and finance |
| Serials | `abts_*`, `bulletins`, `serialcirc_*` | Subscriptions and issues |
| Staff/security | `users`, `acces_profiles`, `acces_rights`, `admin_session` | Back-office accounts and ACL |
| CMS | `cms_*` | Portal pages/articles |
| Events | `anim_*` | Library events/animations |
| Digital docs | `explnum_*` | Attached/dematerialized documents |
| Alerts | `dsi_*` | Saved-search notifications ("SDI") |
| ILL/requests | `demandes_*` | Inter-library/document requests |
| Connectors | `connectors_*`, `harvest_*`, `z_*` | Z39.50, OAI-PMH, import/export |
| Search infra | `es_*`, `search_*`, `indexint`, `mots`, `words` | Legacy's own inverted-index search |

### Notable pattern: EAV custom fields

Nearly every major entity has a matching set of `<entity>_custom`,
`<entity>_custom_values`, `<entity>_custom_lists`, `<entity>_custom_dates`
tables (e.g. `empr_custom*`, `notices_custom*`, `pret_custom*`). These
implement admin-defined extra fields per entity — an EAV pattern layered on
top of the fixed columns. When reading legacy behavior for a feature, check
whether it relies on these before assuming the fixed columns are the whole
story.

## pmb-next current state

No database is connected and no ORM/driver is installed — intentional,
see [CLAUDE.md](../CLAUDE.md) ("no speculative dependencies").

A **target schema has been designed but not applied**: see
[06-legacy-data-model.md](06-legacy-data-model.md) for the full legacy
inspection (entities, relationships, weak points) and
[07-target-schema.md](07-target-schema.md) for the proposed PostgreSQL
design, implemented as `prisma/schema.prisma`.

## Target approach

- **Scope the schema to the feature**, not the domain. When a feature is
  picked up (per [05-roadmap.md](05-roadmap.md)), design the minimum set
  of tables/columns it needs, informed by — but not copied from — the
  matching legacy domain group above.
- **Prefer normalized, fixed-column tables** over reproducing the legacy
  EAV custom-field pattern. Only introduce a dynamic-fields design if a
  migrated feature genuinely requires admin-configurable fields, and treat
  that as a deliberate decision to record in that feature's `docs/` entry.
- **Data migration is per-feature, not whole-database.** When a feature
  needs existing CDI data (e.g. the current catalog or patron list), write
  a scoped export/import for that feature's tables only, at the point it's
  scheduled — not as a general-purpose legacy DB dump/restore.
- **DB engine/driver choice is deferred** to the first feature that needs
  one (see open decisions in [01-architecture.md](01-architecture.md)).
  Whether legacy data must be migrated is the main input to that choice.
