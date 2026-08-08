# Architecture

## Legacy architecture (reference only)

Understanding this is what makes reading `../CDI_PROJECT` productive.

- **Monolith, no framework.** Root-level `.php` files are the OPAC (public
  catalog): `index.php`, `catalog.php`, `search.php`-style flows, `cart.php`
  (basket), `circ.php`, `resa` (reservations), `dsi.php` (saved-search
  alerts), etc. The `admin/` folder is the staff back office, organized by
  module (`admin/notices`, `admin/empr`, `admin/acquisition`, `admin/users`,
  `admin/security`, ...).
- **Two class layers.** `classes/` is older procedural-flavored OOP, one
  class per concern (`pret.class.php`, `author.class.php`, ...). `Pmb/` is a
  newer PSR-4 namespace (`Pmb\`, autoloaded via `composer.json`), organized
  by domain (`Pmb/Authentication`, `Pmb/CMS`, `Pmb/Harvest`, `Pmb/MFA`,
  `Pmb/REST`, ...). New-ish features live in `Pmb/`; most of the app is
  still in `classes/`.
- **Database.** Single MySQL/MariaDB database, ~514 tables, raw SQL (no
  ORM). Schema at `../CDI_PROJECT/tables/bibli.sql`. See
  [03-database.md](03-database.md).
- **No API layer.** Pages render server-side HTML; `ajax.php` /
  `ajax_selector.php` handle dynamic fragments. A handful of newer features
  expose REST under `Pmb/REST`.
- **Front-end.** Mostly server-rendered HTML + jQuery-era JS. A few admin
  widgets (dashboard grid layout, rich text editing) are Vue 2 components
  bundled with Webpack 4 (`webpack.config.*.js`, `package.json` at the
  legacy root).
- **Auth.** PHP sessions (`sessions` table) plus a custom ACL
  (`acces_profiles` / `acces_rights`), with newer MFA support under
  `Pmb/MFA`.

## Target architecture (pmb-next)

- **Next.js 16, App Router, React 19, TypeScript, Tailwind v4.** See
  `node_modules/next/dist/docs/` before writing routing/data code — this
  Next.js version has breaking changes from training-data assumptions.
- **Route groups mirror the legacy public/staff split**: a `(opac)` group
  for public catalog routes, an `(admin)` group for staff back office, both
  in the same `app/` tree. Neither group exists yet — create it when the
  first route in that group is built, not speculatively.
- **Server Components by default.** Client Components only for genuinely
  interactive pieces (search-as-you-type, admin forms/editors) — the same
  "mostly server-rendered plus JS islands" shape as the legacy app, on
  modern tooling.
- **No API layer split from the app.** Use Next.js server-side data access
  (Server Components / Server Actions per the current docs) instead of
  standing up a separate REST/GraphQL service, unless a concrete need
  (e.g. a mobile client) appears.

## Legacy → target mapping

| Legacy | pmb-next equivalent |
|---|---|
| Root `*.php` (OPAC) | `app/(opac)/...` routes |
| `admin/<module>` | `app/(admin)/<module>/...` routes |
| `classes/`, `Pmb/` | `lib/` or feature-local code, introduced when needed |
| `ajax.php` fragments | Server Actions / route handlers, per current Next.js docs |
| `tables/bibli.sql` | Purpose-built schema per migrated feature (not ported wholesale) |
| `styles/<theme>` | Single Tailwind-based design system, see [02-design-system.md](02-design-system.md) |

## Decisions made

- 2026-08-06 — Rewrite, not lift-and-shift. Legacy code is read for
  behavior, not copied.
- 2026-08-06 — No database client, ORM, or auth library installed yet.
  Chosen at the point the first feature actually needs one, not in advance.

## Open decisions (deliberately deferred)

- **Data layer / DB driver**: undecided. Will be picked when the first
  DB-backed feature is scoped — a strong input is whether legacy data needs
  to be migrated (favors staying on MySQL/MariaDB) or not (opens the field).
- **Auth approach**: undecided. Legacy's session+ACL model is a reference,
  not a requirement — decide when the first feature needing login is
  scoped.
- **Hosting/deployment target**: not yet chosen.
