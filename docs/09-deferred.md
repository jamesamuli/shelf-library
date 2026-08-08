# Deferred work

Everything knowingly left undone, so it is decided later rather than
discovered later. Add to this file whenever something is deferred; delete
entries when they land.

Last reviewed: 2026-08-08, after the public catalogue module.

## 1. Blocking before real users touch this

| # | Item | Why it blocks |
|---|---|---|
| 1.1 | **No brute-force protection** on sign-in | Nothing rate-limits the login action; passwords can be guessed as fast as the server responds. Legacy blocked after 5 failures for 180s (`Pmb/Security/Library/Auth.php`). Needs a table + migration. scrypt raises the cost per guess but is not a substitute. |
| 1.2 | **Seeded dev passwords are live** | `bibliothecaire` / `dev-gestion-2026` and card `E-2026-0001` / `dev-lecteur-2026` exist in the linked database. Rotate before anyone else can reach the app. |
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
- **Are holds placed on a record or a specific item?** Legacy allows
  record-level, which the schema keeps — confirm against real practice.
- **Is Google sign-in wanted?** It is in the brand kit's login mockup and
  legacy supported it (`league/oauth2-google`). Needs a client id, secret
  and redirect URI before anything can be built or tested.

## 3. Authentication gaps

Sign-in itself works; these are the pieces around it. See
[08-authentication.md](08-authentication.md).

- **3.1 Authorization.** `roles` / `role_permissions` exist in the schema
  but nothing reads them — a signed-in staff user has no permission checks
  at all. Needed the moment Gestion has real screens to protect.
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
- **4.4 Record detail does ~8 queries.** `getRecord()` uses Prisma
  `include`, which issues one round trip per relation — ≈1.6 s warm against
  the remote database, versus ≈260 ms for search, which is a single raw
  query. Fetch the detail in one query the same way. See
  [10-catalogue.md](10-catalogue.md).
- **4.5 Catalogue browse and facets.** Search exists; browsing by subject,
  by author, by collection, and result facets do not. Their own modules.
- **4.6 `pg` SSL deprecation.** Every script run warns that `sslmode`
  aliases (`prefer`, `require`, `verify-ca`) change meaning in `pg` v9.
  Harmless today; pin `sslmode` explicitly before upgrading.

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
  `next build`, all run by hand.

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

## 7. Smaller cleanups

- **7.1 Icon strategy.** The auth screens hand-roll their SVGs (user, lock,
  eye, chart, book, sun, moon). At the third screen needing icons, switch
  to a single small set rather than spreading more by hand.
- **7.2 i18n approach.** A plain typed dictionary, deliberately not a
  library. Revisit at a third locale, or when plural/date formatting is
  needed.
- **7.3 Stray parent-directory package files.** `next build` warns it
  ignored `package-lock.json` in `D:\Coding` because it sits outside the
  repo. Harmless, but it suggests a stray `package.json` one level up.
- **7.4 The default `/` route** redirects to the login screen because
  nothing else exists. Replace with a real landing page once the portals
  have content.
