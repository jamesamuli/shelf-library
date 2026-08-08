# Authentication

Covers sign-in only. Authorization (what a signed-in user may do) is a
separate concern — see the `roles` / `role_permissions` design in
[07-target-schema.md](07-target-schema.md).

## Legacy behavior (reference)

Two separate login paths, which is why the rewrite keeps two portals:

| | Gestion (back office) | OPAC (public catalog) |
|---|---|---|
| Entry point | `index.php` → `main.php` | `opac_css/` → `ajax.php?categ=auth` |
| Identifies by | `users.username` | `empr.empr_cb` — the **patron card number** |
| Password check | `MySQL::password()` in `Pmb/Common/Helper/MySQL.php` | `password::verify_hash()` (bcrypt) or a legacy format |
| Session | PHP session `PhpMyBibli` | separate OPAC session |

Other legacy behavior worth naming:

- **Attempt throttling** (`Pmb/Security/Library/Auth.php`): IP allow/deny
  lists, block after 5 failures for 180s, all configurable in `parametres`.
- **Optional MFA** (TOTP or emailed OTP), off by default.
- **`ret_url`** carried through the form to return the user where they came
  from after sign-in.
- **Multi-database selector** on the login form when several PMB databases
  are configured.
- OPAC extras: forgotten-password (`askmdp.php`), self-registration
  (`subscribe.php`), LDAP (`empr_ldap`).

### Legacy weaknesses this rewrite fixes

1. **Staff password hashing is unsalted double-SHA1** —
   `"*" . strtoupper(sha1(hex2bin(sha1($pass))))`, MySQL's old `PASSWORD()`
   algorithm, stored in a `varchar(50)`. Unsalted and fast: trivially
   attacked with rainbow tables or a GPU. Patrons fare better (bcrypt), but
   a legacy non-bcrypt branch is still accepted.
2. **Plaintext patron passwords are representable** —
   `empr.empr_password_is_encrypted` is a flag, so "not encrypted" is a
   supported state.
3. The login form is assembled as a PHP string with interpolated
   translations, so markup and escaping are hand-managed per field.

## What was built

Routes, all under the `(auth)` route group:

- `/` — redirects to the sign-in screen; nothing else is built yet.
- `/login` — redirects to `/login/gestion`.
- `/login/gestion` — staff sign-in, identifier = username.
- `/login/opac` — patron sign-in, identifier = card number
  (`inputMode="numeric"` so mobile shows a keypad).
- `/login/[portal]/mot-de-passe-oublie` — who to contact; no self-service
  reset exists.

Files:

| File | Role |
|---|---|
| `app/(auth)/_lib/portals.ts` | Portal config; both screens are driven from it |
| `app/(auth)/_lib/session.ts` | HMAC-signed cookie sessions |
| `app/(auth)/_lib/credentials.ts` | **The only data-source boundary** — queries the database |
| `app/(auth)/_actions/login.ts` | Server Action: validate → verify → session → redirect |
| `app/(auth)/_components/login-form.tsx` | Client form (`useActionState`) |
| `app/(auth)/_lib/password.ts` | scrypt hashing and verification |
| `app/(auth)/_components/brand-mark.tsx` | Theme-specific logo tile + wordmark |
| `app/(auth)/_components/portal-switch.tsx` | Segmented Gestion/OPAC control |
| `app/(auth)/_components/preferences-bar.tsx` | Theme and language switches |
| `lib/preferences.ts`, `lib/i18n.ts` | Cookie-backed theme/locale, translations |

Decisions:

- **Sessions are stateless signed cookies** (HMAC-SHA256 over a JSON
  payload, `httpOnly`, `sameSite=lax`, `secure` in production, 8h TTL),
  not the server-side session table legacy used. Signature comparison is
  constant-time. Requires `AUTH_SECRET` — see `.env.example`.
- **Separate cookie per portal** (`pmb_gestion_session`,
  `pmb_opac_session`), so a librarian and a patron on the same browser do
  not evict each other. Legacy also kept these separate.
- **`?next=` replaces `ret_url`**, and is rejected unless it is a
  same-site absolute path — legacy passed it through unvalidated.
- **Failed sign-in never says which field was wrong**, to avoid confirming
  that an account exists.
- **No new dependencies.** Validation is a handful of inline checks rather
  than a schema library; signing and hashing use `node:crypto`; i18n is a
  plain typed dictionary.
- **French is the default UI language, with English available** via the
  switch. Code and comments stay English.

Accessibility: real `<label>` elements (legacy OPAC relied on placeholders
with visually-hidden labels), `aria-invalid` + `aria-describedby` wiring
field errors, an `aria-live="polite"` region for form-level errors, the
password reveal as a real `<button>` with `aria-pressed`, and focus rings
left intact per [02-design-system.md](02-design-system.md).

Verified in the browser: empty submit renders both field errors with
correct ARIA wiring and surfaces form-level errors in the live region.

## Credential verification (implemented)

`verifyCredentials()` in `_lib/credentials.ts` now queries the database:
Gestion by `staff_users.username`, OPAC by `patrons.barcode`.

**Hashing** (`_lib/password.ts`) uses scrypt from `node:crypto` — memory-
hard, and no dependency to add. Format is
`scrypt$N$r$p$salt_b64$key_b64`, so parameters travel with each hash and
can be raised later without invalidating existing ones. Comparison is
constant-time via `timingSafeEqual`.

**Patron eligibility** is checked beyond the password: no password set,
`anonymized_at`, an expired `expires_on`, a future `blocked_until`, or a
status with `allows_opac_login = false` all reject. Staff must be
`is_active`. Every rejection returns a bare `invalid` with no reason, and
misses burn comparable time via `burnVerificationTime()`, so neither the
body nor the timing reveals whether an identifier exists.

`unavailable` is now reserved for a database failure, keeping it distinct
from bad credentials so the form doesn't blame the user's password.

Signed-in landings exist at `/gestion` and `/catalogue`, guarded by
`requireSession(portal)`, with sign-out wired to `destroySession()`. They
are placeholders for the real portals — they confirm identity and let you
sign out, nothing more.

**Seeded accounts**: `prisma/seed.ts` creates one staff user
(`bibliothecaire`) and one patron (card `E-2026-0001`). Passwords are
never hardcoded — set `SEED_STAFF_PASSWORD` / `SEED_PATRON_PASSWORD`, or
a random one is generated and printed once. Re-seeding resets them.

Verified end to end in the browser: wrong password rejected with the
generic message; correct password redirects to the portal landing with the
name read from the database; the session cookie is not visible to
`document.cookie`; a Gestion session does not grant `/catalogue`; sign-out
clears the session and the guard then bounces back to the login. The five
patron eligibility rules were each exercised against the live database.

## Still not implemented

- **Attempt throttling.** Legacy blocks after 5 failures for 180s. Now
  that a database exists this is buildable, but it needs a table and a
  migration. **Required before this is exposed publicly** — there is
  currently no brute-force protection at all.
- **MFA**, forgotten-password, self-registration, LDAP, multi-database
  selector — deferred; confirm which the CDI actually uses.
- **Legacy password migration.** If legacy accounts are imported, their
  hashes are bcrypt (patrons) or unsalted double-SHA1 (staff) and will not
  verify against scrypt. That needs a compatibility path that verifies the
  old format once and re-hashes to scrypt on successful sign-in.
- **Authorization.** `roles` / `role_permissions` exist in the schema but
  nothing reads them; a signed-in staff user currently has no permission
  checks.

## Branding (applied)

Built from `assets/shelf-library-brand/`, following its `ui-assets/Login.png`
mockup: one centered card, logo at the top, a two-segment portal toggle,
fields with leading icons and an inline reveal toggle, a forgotten-password
link, and trust markers below the card.

Decisions taken while applying it:

- **Colors** come from the `Brand guideline.png` swatches, by decision.
  The kit's `colors/css-variables.css` disagrees slightly (navy `#10233C`
  vs `#0F1B2E`) and is unused. Hovers, borders and danger/info are derived,
  since the guideline gives six brand colors rather than a UI system.
- **Typography** is Playfair Display for headings and Inter for body, per
  guideline §04. Geist Mono is kept for identifiers (call numbers,
  barcodes, ISBNs), which the brand kit does not cover.
- **Copy stays French.** `Login.png` is written in English, but both
  in-app mockups (`GESTION.png`, `OPUS.png`) are French, as are the CDI's
  users. The English login copy is treated as the outlier.
- **The public portal stays "OPAC"**, by decision, though the mockups
  label it "OPUS".
- **The logo is the horizontal lockup**, `Horizontal logo whitemode.svg` for
  light and `Horizontal logo darkmode.svg` for dark, at 224px wide (256px
  from `sm`).

  These variants draw "Shelf" and "LIBRARY" as `<text>` in Playfair Display
  and Inter — the two faces the app already loads. That only resolves when
  the SVG is **inlined in the document**: an `<img>` or `background-image` is
  an isolated document and cannot reach the page's fonts. So the markup is
  embedded by `_components/horizontal-logo.tsx` (generated from the source
  files) with `font-family` rewritten to the `next/font` CSS variables, and
  the generic `.cls-N` class names prefixed per variant so the two cannot
  collide. Verified: the text computes to Playfair Display 48px and Inter
  14px, not a fallback.

  The Asset 14/15 tiles are no longer used.
- **The portal segments carry icons** matching the mockup — a trend line for
  Gestion, an open book for OPAC.
- **The portal toggle is links, not client state**, so each portal keeps a
  bookmarkable URL and works without JavaScript. `/login` now redirects to
  `/login/gestion`, and the old chooser page is gone.
- **Forgotten password** points at a real page that says who to contact.
  Legacy emailed a reset link (`askmdp.php`); there is no mail transport
  here yet, and a link to nothing would be worse.

**First visit vs. return** is answered twice, at different confidence:

- *On the login screen*, before anyone has identified themselves, the only
  available signal is the device. A long-lived `pmb_returning` cookie, set
  inside `createSession()` so it is only written after credentials actually
  verified, picks "Bienvenue"/"Welcome" over "Bon retour"/"Welcome back". It
  deliberately survives sign-out. Being device-scoped, it is approximate: a
  new browser reads as new, and a shared machine can greet a genuinely new
  user as returning.
- *On the landing page*, the answer is exact. `last_login_at` is read
  **before** it is updated during verification, so null means a true
  first-ever sign-in for that account. It travels in the session payload as
  `firstLogin` and produces "Bienvenue, {name}" / "Bon retour, {name}".
  `patrons.last_login_at` was added (migration `patron_last_login`) to
  mirror `staff_users.last_login_at`, so both portals can tell them apart.

**Theme and language** are user preferences, not system-derived — see
[02-design-system.md](02-design-system.md). The app opens on the sign-in
screen (`/` redirects to `/login` → `/login/gestion`) in light mode and
French, with switches above the card.

Verified: `/` lands on the login screen; light is the default and computes
to the guideline values (warm ivory `#EDE7DC` ground, white card) while
dark uses charcoal `#111827` with a navy `#0F1B2E` card and swaps the logo
tile; both switches persist across sign-in; every string on the screen
translates, including the OPAC identifier label ("Numéro de carte" /
"Card number"); sign-in still works end to end for both portals; no
horizontal overflow at 375px, with 44×44px switch targets.

Verified for the greeting: a device with no `pmb_returning` cookie shows
"Bienvenue" on the login screen, and "Bon retour" after signing in and out.
With `last_login_at` reset to null, the landing page showed "Welcome,
Hélène Martin" on the first sign-in and "Welcome back, Hélène Martin" on
the next — the account-scoped path.

## Not built from the mockup

- **"Continue with Google".** Real OAuth needs a client id and secret and a
  registered redirect URI — none of which exist here — so no button is
  rendered rather than one that does nothing. Legacy did support Google
  (`league/oauth2-google` in its composer.json), so this is plausible to
  want; it needs credentials and a decision.
- The language selector and light/dark toggle visible in the dashboard
  mockups. Theme currently follows `prefers-color-scheme` with no manual
  override, and i18n is not scheduled.
