# Roadmap

Phased by risk and dependency, per the prioritization rule in
[04-migration.md](04-migration.md): read-only and stateless before
write-heavy and stateful. Phases are sequential gates, not calendar
deadlines — don't start phase *N+1* until phase *N*'s features are working
in the browser and documented in `docs/`.

## Phase 0 — Project setup (done, 2026-08-06)

- Repo scaffolding (`create-next-app`, Tailwind v4, TypeScript).
- [CLAUDE.md](../CLAUDE.md) development principles.
- `docs/` and `assets/` folders established.
- No application feature exists yet.

## Phase 1 — Public catalog (OPAC), read-only (done, 2026-08-08)

- Full-text search over records, authors and subjects; accent-insensitive.
- Record detail with holdings and live availability.
- Public: renders signed out. Subscriber-only visibility honoured.
- Written up in [10-catalogue.md](10-catalogue.md).
- Not done, and their own modules: browsing by subject/author/collection,
  and result facets.

## Phase 2 — Patron accounts and circulation (loans done, 2026-08-08)

- **Done:** authentication (both portals), check-out, check-in, renewal,
  the staff dashboard and desk, and the patron's own loans and history.
  Written up in [11-circulation.md](11-circulation.md).
- **Also done:** reader enrolment with CSV class import
  ([13-readers.md](13-readers.md)), and staff-side reservations —
  current / overdue / to-reshelve, with assign, lend, delete and clear
  ([14-reservations.md](14-reservations.md)).
- **Not done:** readers placing their own holds from the OPAC, and check-in
  trapping a returned copy for the next reader. See item 4.7 in
  [09-deferred.md](09-deferred.md).
- Legacy reference: `empr*`, `pret`, `pret_archive`, `resa`, `circ.php`,
  `account.php`.

## Phase 3 — Back-office cataloging (done, 2026-08-08)

- Record list, create, edit and delete; copies added, edited and deleted
  on the record they belong to. Written up in
  [12-cataloguing.md](12-cataloguing.md).
- Authorities (authors, publishers, subjects) are created inline by typing
  them. A dedicated authorities module — merging, renaming, the subject
  hierarchy — does not exist.
- Legacy reference: `catalog.php`, `catalog/notices`, `catalog/expl`.
- **Still unguarded:** any signed-in staff user can edit or delete
  anything. Authorization is deferred item 3.1 and should land next.

## Phase 4 — Lower-traffic back-office modules

- Acquisitions (`admin/acquisition`, `budgets`, `paiements`).
- Serials (`admin/abonnements`, `abts_*`, `bulletins`).
- Events (`admin/animations`, `anim_*`).
- CMS/portal pages (`admin/cms`, `cms_*`).
- Order within this phase is not fixed — pick based on actual CDI need
  when this phase starts.

## Deferred indefinitely

Not on this roadmap; revisit only if explicitly requested (see
[04-migration.md](04-migration.md) for why):

- Protocol connectors (Z39.50, SIP2, OAI-PMH/harvest).
- Digital lending (`pnb_*`).
- Multi-language i18n.
- Legacy theming system.
