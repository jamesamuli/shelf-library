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

## Phase 1 — Public catalog (OPAC), read-only

- Catalog search (by title/author/keyword) and browsing by category.
- Notice (bibliographic record) detail page.
- No authentication, no write paths.
- Legacy reference: root `catalog.php` / search flow, `notices`,
  `notices_*`, `authorities`, `categories`, `exemplaires` (for
  availability display).
- Why first: highest visible value, lowest risk (no writes, no auth), and
  forces the data-layer decision (see [01-architecture.md](01-architecture.md))
  on a low-stakes feature.

## Phase 2 — Patron accounts and circulation

- Patron login, loan history, current loans, holds/reservations.
- Legacy reference: `empr*`, `pret`, `pret_archive`, `resa`, `circ.php`,
  `account.php`.
- Depends on: an auth approach being decided (open decision in
  [01-architecture.md](01-architecture.md)) and a write-capable data layer.

## Phase 3 — Back-office cataloging

- Staff-only: create/edit bibliographic records and copies.
- Legacy reference: `admin/notices`, `edit.php`, `exemplaires`.
- Depends on: staff auth/ACL (separate from patron auth — legacy keeps
  these distinct via `users`/`acces_profiles` vs `empr`).

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
