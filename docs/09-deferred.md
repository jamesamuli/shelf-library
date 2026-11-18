# Deferred work

Everything knowingly left undone, so it is decided later rather than
discovered later. Add to this file whenever something is deferred; delete
entries when they land.

Last reviewed: 2026-09-14, after the authorization module.

## 1. Blocking before real users touch this

| # | Item | Why it blocks |
|---|---|---|
| 1.1 | **No brute-force protection** on sign-in | Nothing rate-limits the login action; passwords can be guessed as fast as the server responds. Legacy blocked after 5 failures for 180s (`Pmb/Security/Library/Auth.php`). Needs a table + migration. scrypt raises the cost per guess but is not a substitute. |
| 1.2 | **Seeded dev passwords are live** | `bibliothecaire` / `dev-gestion-2026`, card `E-2026-0001` / `dev-lecteur-2026`, and the `admin` account created by `scripts/create-admin.ts` all exist in the linked database. Rotate before anyone else can reach the app. |
| 1.3 | **Production `AUTH_SECRET`** | Only set locally in `.env`. Sessions are signed with it; changing it invalidates every session. |
| 1.4 | **Nothing is committed** | 1 commit (`Initial commit from Create Next App`), 24 uncommitted paths, branch `master`, no git remote. All work so far exists only in the working tree. |

## 2. Decisions needed (from the CDI / product side)

These change what gets built, so they are worth answering before the
matching feature starts.

- **Is legacy PMB data being migrated, or is this a fresh start?** The
  single biggest open question. Decides whether `barcode`/`isbn` must
  tolerate legacy dirty values, whether ID continuity matters, and whether
  item 3.5 below is needed at all. See
  [07-target-schema.md](07-target-schema.md).
- **Do patrons authenticate against LDAP?** Legacy has `empr_ldap`. If yes,
  `patrons.password_hash` may be unnecessary.
- **Which of legacy's ~20 `empr_statut.allow_*` flags does the CDI use?**
  Only the used ones should become columns; four are modelled today.
- ~~Is subscriber-only OPAC visibility used?~~ **Answered: yes, legacy
  behaviour kept.** Implemented in the catalogue module.
- **Are holds placed on a record or a specific item?** Legacy allows
  record-level, which the schema keeps — confirm against real practice.
  Blocks the holds module (4.7).
- **Should loan duration vary by document type?** Legacy took it from the
  document type; we take it from the patron category. One column either
  way. See [11-circulation.md](11-circulation.md).
- **Does the CDI block readers who return late?** Legacy suspended them for
  `days × coef`. `patrons.blocked_until` exists and check-out honours it,
  but nothing sets it.
- **Is Google sign-in wanted?** It is in the brand kit's login mockup and
  legacy supported it (`league/oauth2-google`). Needs a client id, secret
  and redirect URI before anything can be built or tested.

## 3. Authentication gaps

Sign-in itself works; these are the pieces around it. See
[08-authentication.md](08-authentication.md).

- **3.1 Authorization — done**, see
  [15-authorization.md](15-authorization.md). Seven permission keys, three
  roles, checked in every Server Action and on every page. What is *not*
  done: staff accounts still cannot be created or disabled from the UI (the
  screen only assigns roles to existing accounts — `scripts/create-admin.ts`
  makes them), there is no audit trail of who deleted what, and legacy's
  second layer of per-location / per-category ACLs in `admin/acces` is out of
  scope for a single-site CDI.
- **3.2 Password reset.** Currently an information page telling users who
  to contact. A real reset needs mail transport, which the app does not
  have. Legacy used `askmdp.php`.
- **3.3 MFA.** Legacy supported TOTP and emailed OTP, off by default.
- **3.4 Self-registration.** Legacy `subscribe.php`.
- **3.5 Legacy password migration.** If old accounts are imported, their
  hashes are bcrypt (patrons) or unsalted double-SHA1 (staff) and will not
  verify against scrypt. Needs a compatibility path that verifies the old
  format once and re-hashes to scrypt on successful sign-in.
- **3.6 Session hardening.** No rotation on privilege change, no refresh,
  no "remember me". CSRF currently rests on `SameSite=lax` plus Next's
  built-in Server Action protections.
- **3.8 `patrons.password_hash` and `patrons.login` no longer sign anyone
  in** since readers use Google only (`login` is still filled in when a
  reader is created, but nothing reads it). Kept so imported legacy data
  loses nothing; drop them in a migration, with the reader form's login
  field, once the CDI confirms there is no way back to card + password
  sign-in. The same goes for 3.5's bcrypt path,
  which now only concerns staff.
- **3.7 Multi-database selector.** Legacy offered one at login when several
  PMB databases were configured. Probably not wanted — confirm and delete
  this line.

## 4. Data layer

- **4.1 Full-text search beyond the catalogue.** Records, authors and
  subject labels now have generated `tsvector` columns with GIN indexes and
  an accent-insensitive `french_unaccent` configuration (done in the
  catalogue module). Other searchable entities — patrons, holdings by
  barcode — have none yet.
- **4.2 Custom-field validation.** Entities carry a `custom_fields` JSONB
  column and `custom_field_definitions` records what an admin declared, but
  nothing validates values against the definitions yet.
- **4.3 Domains not modelled.** Acquisitions, serials/subscriptions, CMS,
  events, digital documents and connectors are deliberately out of the
  current schema — see the phase list in [05-roadmap.md](05-roadmap.md).
- **4.4 `prisma migrate dev` will try to break full-text search.** The
  `search_vector` columns are `GENERATED ALWAYS AS … STORED`, which Prisma's
  schema language cannot express. They are declared as
  `Unsupported("tsvector")?` with their GIN indexes so `migrate dev` no
  longer offers to DROP them, but a drift check still reports three
  unavoidable lines:

  ```
  ALTER TABLE "…" ALTER COLUMN "search_vector" DROP DEFAULT;
  ```

  Prisma reads the GENERATED expression as a column default. **If a
  generated migration contains those lines, delete them** — applying one
  turns the columns into ordinary empty columns and search silently returns
  nothing. Check with:

  ```
  npx prisma migrate diff --from-config-datasource prisma.config.ts     --to-schema prisma/schema.prisma --script
  ```

  Anything beyond those three lines is real drift.
- **4.5 Catalogue browse and facets.** Search exists, and so does a single
  genre filter (the home's tiles — [16-opac-home.md](16-opac-home.md)).
  Browsing by subject, by author, by collection, and multi-value facets with
  counts do not. Their own modules.
- **4.14 Genre management screen.** The tiles are data (`genres`), but
  editing them — rename, reorder, recolour, add, remove — is SQL for now.
  A small Gestion screen behind `catalog.edit` would do; the icon and colour
  pickers choose from the closed sets listed in
  [16-opac-home.md](16-opac-home.md) §6.
- **4.15 Monthly suggestions.** The CDI floated suggesting books "based on
  different months" as an alternative to plain new arrivals. Not built;
  needs a definition first — seasonal themes (subjects tagged per month),
  what circulated most last month, or a librarian's monthly pick.
- **4.16 Library name and practical details setting.** The OPAC welcome
  names the École Française de Bujumbura from the dictionary, and the
  home's opening hours, place and contact live in `lib/library-info.ts`
  (empty, so hidden, until the CDI fills them in). Legacy keeps such
  things in `parametres`; a settings screen would let the CDI edit them
  without a deploy.
- **4.17 Covers beyond the home.** Covers show on new-arrival cards only —
  not yet in the results list or on the record page. The record form has
  no field for `thumbnail_url` either, so ISBN-derived Open Library covers
  are the only source in practice. "See all new arrivals" (results sorted
  by date) is also not built.
- **4.19 Cache the home's data across visitors.** New arrivals and genres
  are queried on every request — most of the home's time to first byte.
  Next 16's way is Cache Components (`cacheComponents: true` + `"use
  cache"`, with `cacheTag` revalidated by the cataloguing actions). It is
  an app-wide switch that changes how every page treats cookies and
  dynamic data, so it wants its own task rather than riding on another.
- **4.18 Legacy home blocks not ported.** Thesaurus browser, section
  browser, the two Dewey browsers ("marguerite", "100 cases"), newsletters
  (`bannettes`), virtual shelves (`etageres`), info pages and RSS.
- **4.7 Holds: built for staff, not yet joined up.** The Réservations screens
  exist (see [14-reservations.md](14-reservations.md)), but three connections
  are still missing: readers cannot place their own holds from the OPAC,
  check-in does not trap a returned copy for the next reader in line, and
  check-out does not refuse a copy that is held for someone else (legacy's
  trap 8). The middle one is the most valuable.
- **4.9 Authority management.** Authors, publishers and subjects are
  created by typing them into a record. Nothing merges duplicates, renames
  one everywhere, or models the subject hierarchy legacy keeps in
  `categories`. Its own module — see
  [12-cataloguing.md](12-cataloguing.md).
- **4.10 Z39.50 / BnF import.** How most French CDIs actually catalogue:
  scan an ISBN, pull the record. Typing records by hand is the alternative
  we shipped. Probably the highest-value addition to cataloguing.
- **4.11 Concurrent edits.** Legacy locked a record while someone edited
  it. Here the last save wins, silently. A stale-write check on
  `updated_at` would be the cheap version.
- **4.8 Circulation side-effects legacy had.** Overdue notices
  (`niveau_relance` is stored but never advanced), fines and patron
  accounts, the opening calendar, short loans, group loans, and item
  processing flags. All listed in [11-circulation.md](11-circulation.md) §2.
- **4.6 `pg` SSL deprecation.** Every script run warns that `sslmode`
  aliases (`prefer`, `require`, `verify-ca`) change meaning in `pg` v9.
  Harmless today; pin `sslmode` explicitly before upgrading.
- **4.12 Connection-pool settings are measured, not guessed — keep them
  that way.** Opening a connection to Prisma Postgres costs 7s warm and
  12.8s cold; a pooled one with `keepAlive` survives 60s+ idle and answers
  in ~250ms. An earlier `idleTimeoutMillis: 10_000` therefore made things
  worse on both counts, forcing a fresh handshake after every pause and
  producing the very "Server has closed the connection" errors it was meant
  to prevent. Re-measure before changing `lib/prisma.ts`.
- **4.13 Only reads are retried** on a lost connection. A write that fails
  that way may have committed, so it surfaces instead. If write failures
  become common, the answer is a transaction plus an idempotency key, not a
  blind retry.

## 5. Deployment

- **5.1 Prisma Compute deploy never completed.** Blocked on interactive
  browser sign-in (`@prisma/cli auth login`). Prep is done: `output:
  "standalone"` is set in `next.config.ts` (without it every request 504s),
  and the initial migration is applied.
- **5.2 No git remote, and the deploy branch does not exist.** The repo is
  on `master`; the intended deploy branch was `main`. If the Prisma project
  is GitHub-connected, deploys build from that repo, not this working tree.
- **5.3 No CI and no tests.** No test runner, no test script, no
  `.github/`. The only automated checks are `tsc --noEmit`, `eslint` and
  `next build`, all run by hand. Every module so far has been verified by a
  throwaway script of database-level assertions — 33 for circulation, then 78
  covering the whole domain — each of which found real defects and was then
  deleted because there is nowhere to keep it. **This is now the most
  expensive omission in the project.** Those assertions are regression tests
  that get rewritten from scratch every time, and each rewrite re-finds only
  what the author thinks to look for.

## 6. Known upstream inconsistencies

Not our bugs, but they will bite whoever touches these next.

- **6.1 The brand kit contradicts itself on colour.** `Brand
  guideline.png` §03 prints Deep Navy `#0F1B2E`; the kit's own
  `colors/css-variables.css` says `#10233C`. We follow the guideline, by
  decision. Worth fixing at source so the kit agrees with itself.
- **6.2 The login mockup is in English** while both dashboard mockups are
  French. We follow the dashboards (French default, English available).
- **6.3 The mockups label the public portal "OPUS"**; we use OPAC, by
  decision.
- **6.4 Sample record *Devenir* has the wrong ISBN.** `prisma/seed.ts`
  gives it 9782081471757, which is Houellebecq's *Sérotonine*; the OPAC
  home shows that cover. Correct it in the seed and in the database — the
  French edition of *Devenir* (Fayard, 2018) has its own ISBN.

## 7. Smaller cleanups

- **7.1 Icon strategy.** `lucide-react` arrived with the OPAC home, which
  needed ten icons. The auth screens, sidebar and search bar still hand-roll
  theirs (user, lock, eye, chart, book, sun, moon, magnifier); move them
  over when those files are next touched, not as a sweep.
- **7.2 i18n approach.** A plain typed dictionary, deliberately not a
  library. Revisit at a third locale, or when plural/date formatting is
  needed.
- **7.3 Stray parent-directory package files.** `next build` warns it
  ignored `package-lock.json` in `D:\Coding` because it sits outside the
  repo. Harmless, but it suggests a stray `package.json` one level up.
- **7.4 The default `/` route** — done: it is the OPAC home
  ([16-opac-home.md](16-opac-home.md)).
- **7.5 Gestion has four nav sections**, against nine in the mockup. The rest
  are omitted rather than stubbed. Add each when its module lands. Screens
  that belong to a section nest under it (Réservations and Lecteurs under
  Circulation) rather than being added as peers, and **selection is matched
  exactly, never with `startsWith`** — a parent lit alongside its own selected
  child reads as two selections and hides which page you are actually on. The
  one exception is a section whose sub-pages have no nav entry of their own,
  like Catalogage's `nouveau` / edit screens.

  A section folds, but **the parent keeps its own link** — Circulation *is*
  the loan desk, and burying the most-used screen a click deeper to make room
  for a disclosure would be a bad trade. So the row carries both: the label
  navigates, the chevron folds. The fold animates `grid-template-rows`
  between `0fr` and `1fr`, which reaches the content's real height without
  measuring it in JS; the panel is `inert` while closed, or hidden links stay
  in the tab order and keyboard focus vanishes into a collapsed section.
  A manual fold survives navigation, but entering the section re-opens it —
  adjusted during render rather than in an effect, which would paint the
  closed state and then animate it open for no reason.
- **7.6 A `"use server"` module may only export async functions.** A
  constant exported from one reaches a Client Component as a server
  reference, and the failure is remote from the cause: the initial
  `useActionState` value became a proxy, so the first render read
  `undefined.date` and the page 500'd. Action *state* types and their
  initial values belong in a plain module.
- **7.7 React clears an uncontrolled form after a function action** —
  including when the action *rejected* the submission. Any form that can
  fail validation must echo its values back in the action state and remount
  on a key, or the user loses everything they typed. Both cataloguing forms
  do this; see `_lib/state.ts`.
- **7.8 Don't key a "new item" form on the list length.** Revalidation
  grows the list, the key changes, the component remounts, and the success
  message it just produced is destroyed. Use a stable key.
- **7.9 Feedback must outlive the row it is about.** If a row action removes
  the row — lending or deleting a reservation — row-scoped `useActionState`
  unmounts with it and the confirmation is never seen. Lift the action state
  to the list and put the message above the table.
- **7.10 Never use `<Link>` for a file download.** A client-side navigation
  to a GET-only route handler leaves the router believing the page *is* that
  route, and the next Server Action POSTs to it and gets a 405. Use a plain
  `<a download>`. This cost an afternoon on the reader import.
- **7.13 A `"use client"` module may not reach the database, however
  innocent the import looks.** The staff table imported `PERMISSIONS` — a
  frozen object of label strings — from a module that also exported a
  Prisma-backed lookup, and the build failed with `Can't resolve 'dns'`.
  Splitting the pure catalogue from the query fixed it. The rule is about the
  *module*, not the value.
- **7.12 Never hand a whole Prisma row to a Client Component.** Both option
  helpers returned full rows to `<select>`s that only ever read `id` and
  `label`, which shipped `PatronCategory.membershipFee` and the
  `PatronStatus` / `ItemStatus` permission flags to the browser — and
  `Decimal` is not a plain object, so React logged "Only plain objects can be
  passed to Client Components" on every render of the readers screen.
  TypeScript cannot catch this: a wider object satisfies a narrower prop type.
  `select` exactly what the component needs.
- **7.14 Playwright screenshots fake a hydration mismatch.** By default a
  screenshot hides the text caret by injecting `caret-color: transparent`
  on inputs; if that lands before hydration, React reports a mismatch on
  every `<input>`. Pass `caret: "initial"` before chasing it.
- **7.15 Device defaults on desktop too?** A phone with no saved choice
  now opens in its own language and light/dark mode; desktop keeps light
  and French, per the earlier decision. Extending it is a one-line change
  in `lib/preferences.ts` (drop the `isPhone()` test) — a CDI call.
- **7.11 Restart `next dev` after `prisma generate`.** The client is cached
  on `globalThis` across HMR, so a newly added model reads as `undefined` and
  the page dies with "Cannot read properties of undefined (reading
  'findMany')".
