# Project

## What this is

A ground-up Next.js rewrite of **PMB** (PMB Services / sigb.net), the open
source library-management system (SIGB — *Système Intégré de Gestion de
Bibliothèque*) currently running the CDI (school documentation/library
center) this project serves. The legacy app is French-language, GPL/CECILL
licensed, and lives at `../CDI_PROJECT` — **read-only reference**, never
edited or copied wholesale.

`pmb-next` is the new application. It is being built feature by feature,
re-implemented with current tools, not translated line-by-line from PHP.

## Why rewrite instead of extend the legacy app

- The legacy codebase is procedural PHP mixed with older OOP (`classes/`)
  and a newer PSR-4 layer (`Pmb/`), no framework, no API layer — pages
  render HTML directly and call `ajax.php` for dynamic behavior.
- ~514 database tables, many with hand-rolled EAV-style "custom field"
  extensions (see [03-database.md](03-database.md)) — hard to reason about
  incrementally.
- Front-end is a mix of server-rendered HTML, jQuery-era JS, and a few Vue 2
  islands bundled with Webpack 4.
- Goal: a smaller, coherent, modern app that does what the CDI actually
  needs — not a reproduction of every PMB feature.

## Goals

- Feature parity **where the CDI actually uses the legacy app** — not
  100% coverage of PMB's feature set.
- Each migrated feature should be simpler, in code, than its legacy
  counterpart, or there was no point rewriting it.
- Every feature verified working in a real browser before being called done.

## Non-goals (unless a specific task asks for them)

- Porting PMB's multi-language i18n (legacy ships fr/en/es/it/pt/la).
- Porting the legacy skin/theme system (`styles/` — ~15 named CSS themes).
- Porting protocol connectors (Z39.50, SIP2, OAI-PMH/harvest) or digital
  lending (`pnb_*`) unless explicitly scheduled.
- Multi-tenant / SaaS support — this is a single-institution app.
- Matching legacy URLs or database schema 1:1.

## Who uses it

- **OPAC visitors** — students/staff searching the public catalog. No
  login required for browsing.
- **Librarians/staff** — cataloging, circulation (loans/returns/holds),
  acquisitions, serials, events, via a back-office area.
- **Administrators** — user accounts, access rights, system settings.

These map to the legacy split between root-level scripts (OPAC) and the
`admin/` folder (back office) — see [01-architecture.md](01-architecture.md).

## Current status

Scaffolding only. No feature has been migrated. See
[05-roadmap.md](05-roadmap.md) for what's next.

## Where things live

```
Coding/
├── CDI_PROJECT/   legacy PHP PMB — read-only reference
└── pmb-next/      this app — write here
    ├── app/       Next.js routes
    ├── docs/      this folder — one doc per feature/decision as work lands
    ├── assets/    non-code reference material (legacy screenshots, exports)
    └── CLAUDE.md  development principles
```
