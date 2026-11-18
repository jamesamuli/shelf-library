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

- `/login` — redirects to `/login/opac` (the reader panel leads the page).
- `/login/gestion` — staff sign-in, identifier = username.
- `/login/opac` — reader sign-in: the Google button only (see "Readers sign in
  with Google only" below). Was card number + password.
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
| `app/(auth)/_lib/google.ts` | Google OpenID Connect: config, authorize URL, code exchange, ID-token and domain check |
| `app/(auth)/login/google/route.ts`, `…/callback/route.ts` | Start and finish a reader's Google sign-in |
| `app/(auth)/_components/google-button.tsx` | "Se connecter avec Google" |
| `app/(auth)/_components/brand-mark.tsx` | Theme-specific logo tile + wordmark |
| `app/(auth)/_components/login-switch.tsx` | Two-tab switch: one sign-in card at a time, animated |
| `app/(auth)/_components/floating-books.tsx` | Decorative books drifting behind the page |
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

`verifyStaffCredentials()` in `_lib/credentials.ts` queries the database
by `staff_users.username`. (OPAC used to be verified by `patrons.barcode`
and a password; readers now sign in with Google only — see below.)

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
- **Typography** was Playfair Display for headings and Inter for body, per
  guideline §04; headings have since moved to Rajdhani at the CDI's request
  (see [02-design-system.md](02-design-system.md)). Geist Mono is kept for identifiers (call numbers,
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
- **The portal toggle is links, not client state**, so each portal keeps a
  bookmarkable URL and works without JavaScript. The old chooser page is
  gone.
- **Forgotten password** points at a real page that says who to contact.
  Legacy emailed a reset link (`askmdp.php`); there is no mail transport
  here yet, and a link to nothing would be worse.

**First visit vs. return** is answered on the landing page, exactly. `last_login_at` is read
  **before** it is updated during verification, so null means a true
  first-ever sign-in for that account. It travels in the session payload as
`firstLogin` and produces "Bienvenue, {name}" / "Bon retour, {name}".
`patrons.last_login_at` was added (migration `patron_last_login`) to
mirror `staff_users.last_login_at`, so both portals can tell them apart.
(The sign-in screen used to guess the same thing from a device cookie,
`pmb_returning`, to choose "Bienvenue" or "Bon retour" as its heading; that
went with the 2026-11-18 redesign below, whose heading names the CDI.)

**Theme and language** are user preferences, not system-derived — see
[02-design-system.md](02-design-system.md). The sign-in screen opens
in light mode and French, with switches above the card. (`/` used to
redirect here; since the OPAC home it is the public catalogue — see
[16-opac-home.md](16-opac-home.md).)

Verified (when `/` still redirected): `/` landed on the login screen; light is the default and computes
to the guideline values (warm ivory `#EDE7DC` ground, white card) while
dark uses charcoal `#111827` with a navy `#0F1B2E` card and swaps the logo
tile; both switches persist across sign-in; every string on the screen
translates, including the OPAC identifier label ("Numéro de carte" /
"Card number"); sign-in still works end to end for both portals; no
horizontal overflow at 375px, with 44×44px switch targets.

Verified for the greeting: with `last_login_at` reset to null, the landing page showed "Welcome,
Hélène Martin" on the first sign-in and "Welcome back, Hélène Martin" on
the next — the account-scoped path.

## Redesign after the CDI's reference (2026-11-18)

The CDI asked for the sign-in page to look like their school catalogue's
(Hibouthèque, Réseau Canopé). The centered card from `Login.png` gave way
to that layout; the brand (logos, palette, type) stays ours.

- **Heading** built like the home page's welcome: "Connexion au CDI",
  then "ÉCOLE FRANÇAISE DE BUJUMBURA" in Shelf teal capitals — the same
  `welcomeSchool` string and the same type (Rajdhani 700, display size, CSS
  `uppercase`), so the two pages cannot drift apart. The Shelf and EFB
  logos above it link back to the catalogue home, with the theme/language
  switches opposite.
- **A stack of "Je me connecte en tant que…" panels**, one per portal,
  readers first. The current portal's panel is open — thick navy border,
  teal wash, its form — and the other is a bar that opens it. Opening is a
  navigation to the other portal's URL, so the segmented toggle's
  properties carry over: no JavaScript needed, bookmarkable, back button
  works. A `?next=` is not carried across, because it named a page of the
  portal being left.
- **Panel wording** follows who signs in, not the reference's roles: "élève
  ou lecteur" (OPAC, card number) and "personnel du CDI : administrateur,
  gestionnaire ou chargé des prêts" (Gestion). The reference's third panel,
  for Canopé staff, has no counterpart here.
- **The form**: labels over plain fields (the leading icons went), the
  reveal toggle inside the password field, a centred teal "Se connecter" in
  Rajdhani, the forgotten-password link at the bottom right, underlined
  navy so it holds 4.5:1 on the teal wash.
- **The picture** is our own — books in the genre colours — not the
  reference's owl, which is Canopé's mascot. (It has since become the
  drifting books behind the page; see "One card at a time" below.)
- **Dropped**: the "Bienvenue / Bon retour" heading and its `pmb_returning`
  cookie, the subtitle, and the trust strip under the card.
- **Forgotten-password page** sits in the same layout, as an open panel.

Verified in Edge (headless): `/login` → `/login/opac`; the Gestion bar
opens `/login/gestion` with its form and focuses "Identifiant"; empty submit
shows both field errors; bad credentials show "Identifiant ou mot de passe
incorrect."; reveal toggles the field type; the logo returns to `/`. No
horizontal overflow at 375, 900 and 1280 px. axe-core (WCAG 2.2 AA + best
practice): no violations on either panel, light/French and dark/English,
nor on the forgotten-password page.

## Google sign-in for readers (2026-11-18)

Every student has a Google Workspace account at **@efbujumbura.com**, so
the reader panel offers "Se connecter avec Google" — since the change
below, as the only way in. Staff keep username + password: their accounts are not
tied to school Google accounts.

Not a port. Legacy lists `league/oauth2-google` in `composer.json`, but
only as PHPMailer's suggested dependency for "Google XOAUTH2"
mail-sending — it never signed users in with Google.

**Flow** — OpenID Connect authorization code with PKCE, written against
Google directly (`app/(auth)/_lib/google.ts`, about 150 lines) rather than
through an auth library, because it only has to hand a verified address to
the session we already have:

1. `GET /login/google[?next=…]` makes a random `state`, `nonce` and PKCE
   verifier, keeps them (with `next`) in the `pmb_google_flow` cookie —
   HttpOnly, `SameSite=Lax` so it survives Google's cross-site redirect
   back, scoped to `/login/google`, ten minutes — and redirects to Google
   with `hd=efbujumbura.com` and `prompt=select_account`.
2. `GET /login/google/callback` deletes the cookie whatever happens, checks
   `state` (login CSRF), redeems the code with the verifier at Google's
   token endpoint, and checks the ID token's claims: issuer, audience,
   expiry, nonce. The token came straight from Google over TLS in exchange
   for a code only we could redeem, which OIDC Core §3.1.3.7 accepts in
   place of verifying its signature.
3. **The domain rule** needs all three: `email_verified` is `true`, `hd` is
   `efbujumbura.com` (only Workspace accounts carry it, so personal Gmail
   fails here), and the address ends in `@efbujumbura.com`. The `hd`
   parameter sent in step 1 only filters Google's account picker; it is not
   relied on.
4. **The reader is found by `patrons.email`** — the school address the
   reader account was created from, stored lowercase — and must pass the
   same OPAC rules as a card sign-in (not anonymised, status allows OPAC
   login, not expired, not blocked), shared in `credentials.ts` as
   `mayUseOpac`. No reader is created on the fly: a reader needs a card
   number, category and class that only the CDI can assign.
5. Success creates the ordinary `opac` session and honours a safe `next`.

**Every failure** returns to `/login/opac?google=<reason>`, which the panel
words: `domain` (not a school account), `no-account` (school address with
no eligible reader — safe to say, since the address is the reader's own),
`cancelled` (backed out at Google), `invalid` (state, code or token
failed), `unavailable` (not configured, or Google unreachable). Unknown
reasons show nothing.

**Configuration** — `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`;
`.env.example` says where to create them and which redirect URIs to
register (`<origin>/login/google/callback`, derived from the request).
Until both are set the button is not rendered, and `/login/google` falls
back to the panel with `unavailable`. Choosing an **Internal** consent
screen in the school's Google Workspace makes Google refuse outside
accounts too, a second wall behind the app's own check.

**Verified**:

- `checkIdToken` against 16 crafted tokens. School account, uppercase
  address and the scheme-less issuer pass. These are refused as `domain`:
  personal Gmail, another school's Workspace, school email without `hd`,
  `hd` right but email elsewhere, `a@evil.efbujumbura.com`,
  `a@efbujumbura.com.evil.io`, unverified email, `"true"` as a string.
  Wrong audience, expiry, nonce, issuer and garbage are refused as
  `invalid`.
- Against the running app with placeholder credentials:
  - The start route answers 307 to Google with PKCE S256, `hd` and the
    callback URI, and sets the cookie as described. The state matches the
    cookie; the verifier is never sent.
  - The callback turns back a missing cookie, a forged state and a missing
    code (`invalid`), a reader backing out (`cancelled`), and a code Google
    refuses (`unavailable`), clearing the cookie each time.
  - All five messages render in French and English.
  - The staff panel shows no Google button and ignores `?google=`.
  - axe: no violations, light and dark.

**Not verified**: a real sign-in, which needs the school's OAuth client.
Also, none of the three readers in the database has an email yet, so none
could sign in with Google until their records carry their school address.

### In a popup (2026-11-18)

At the CDI's request the Google sign-in runs in a **popup window**, so the
sign-in page never reloads. It is the same flow as above, run inside the
popup — PKCE, `state`, `nonce` and the domain rule are untouched — rather
than Google's own popup library, which would mean loading Google's script
on our page.

1. The button (a client component now) opens `/login/google?popup=1` in a
   480×640 popup centred on the window, and shows "Connexion…". The start
   route records `popup: true` in the flow cookie.
2. In the popup: our start route → Google → our callback, exactly as in a
   full-page sign-in.
3. Where the callback would redirect, a popup flow instead answers with
   the **hand-off page** (`handoffPage` in `google.ts`): a few lines of
   HTML whose script posts the destination — the reader's account, or
   `/login/opac?google=<reason>` — on the `BroadcastChannel`
   `pmb-google-signin`, then closes the window. The session cookie set
   with it travels on that response like on a redirect.
4. The sign-in page hears the message and `router.push`es there — a soft
   navigation, no reload. It accepts same-site paths only.

**Why a BroadcastChannel and not `window.opener`**: Google's sign-in pages
send a Cross-Origin-Opener-Policy that cuts a popup off from its opener on
the way through, so by the time the popup is back on our site
`window.opener` is gone. A same-origin channel does not depend on it. If
the window will not close, or nobody is listening, the hand-off page goes
on to the destination itself after 600 ms; without JavaScript, a
`<noscript>` meta refresh does.

**Fallbacks**: if the browser blocks the popup (`window.open` returns
null) the click goes ahead as a normal link and the sign-in runs in the
tab, as before; without JavaScript, likewise. On phones the "popup" opens
as a tab and closes the same way. Coming back to the window with no word
from the popup (the reader closed it) resets the button.

`to` is built by the callback or vetted by `safeRedirect`, and still escaped
for both places it is written (HTML attribute; script, with `<` as
`<`). The channel name lives in `_lib/google-channel.ts` so the
browser bundle does not pull in `google.ts` and its `node:crypto`.

Verified, with Google stood in for at the browser level (our server started
the flow for real, flow cookie included, and "Google" answered that the
reader cancelled):

- `/login/google?popup=1` sets `popup: true`; a popup callback answers 200
  with the hand-off page and clears the flow cookie (cookies travel with
  it); a non-popup callback still answers 307.
- Click → popup opens, the button reads "Connexion…"; the popup asks
  Google (`hd=efbujumbura.com`), comes back, **closes itself**; the sign-in
  page moves to `?google=cancelled` and shows "Connexion Google annulée."
  **without reloading** (a marker set on `window` beforehand survived); the
  button reads "Se connecter avec Google" again.
- Popup blocked → the same click requests `/login/google` in the tab.

**Not verified**: a real Google account in the popup — needs a person to
sign in.

## Readers sign in with Google only (2026-11-18)

At the CDI's request, the card-number + password form is gone: Google is a
reader's only way in. This drops the legacy behaviour the original design
called "worth preserving exactly" (OPAC sign-in on `empr.empr_cb`) — a
deliberate CDI decision, since every student has a school Google account
and readers created here never had a password (`lib/patrons.ts`).

Removed end to end, not just hidden:

- **The `login` Server Action is staff-only.** It no longer reads a portal
  from the form and always verifies against `staff_users`, so a crafted
  post with a card number cannot reach a reader account.
  `verifyCredentials(portal, …)` became `verifyStaffCredentials(…)`, and the
  card-number lookup in `credentials.ts` is deleted; readers are found only
  by `patrons.email`.
- **The reader panel** holds the Google button alone. If the Google
  credentials are missing, it says Google sign-in is unavailable instead of
  showing an empty panel, since readers then have no way in.
- **The forgotten-password page is staff-only**; `/login/opac/mot-de-passe-oublie`
  is a 404, as readers have no password to forget.
- **Gone from the dictionary:** the reader identifier label and placeholder
  ("Numéro de carte"), "ou avec votre numéro de carte", `forgotOpac`, and
  the unused `unknownPortal`. The "unavailable" message no longer points to
  the card number.

The card number itself stays: it is still the reader's identifier at the
loans desk.

Verified in Edge: the reader panel has no input and no forgotten-password
link, only the Google button, in light/French and dark/English (axe: no
violations). The staff panel keeps its two fields and refuses bad
credentials; its forgotten-password page still works, and the reader one is
a 404.

## Sign-in cards (2026-11-18)

The accordion gave way to one card per kind of user. (For a while both
showed side by side; see "One card at a time" for the current switch.)

- **Each card**: on the left, a big icon over a short audience label —
  graduation cap, "Élève ou enseignant", on Shelf teal; user-and-gear,
  "Administrateur ou gestionnaire", on navy. On the right, "Se connecter",
  a one-line hint ("Connectez-vous avec votre compte efbujumbura.com" /
  "…avec votre identifiant Shelf Library"), then the Google button or the
  staff form. The long "Je me connecte en tant que…" sentences are gone
  (`panelTitle` → `audience` + `signInHint`).
- **Teachers sign in on the reader card**: they are readers (patrons) with a
  school Google account, like the students.
- **Both cards say "Se connecter"**, so each heading carries the audience as
  screen-reader-only text ("Se connecter — Élève ou enseignant"), keeping
  the two apart in a heading list.
- **The URL's portal still matters**: it picks the card shown first,
  decides which card a `?next=` goes to and whose existing session sends
  you straight on, and whether the cursor starts in the staff username
  field — only on `/login/gestion`, so on the readers' page focus does not
  skip past their button.
- The Google button wraps beside its logo rather than overflowing a narrow
  card.

## One card at a time (2026-11-18)

At the CDI's request, only one card shows, under a two-tab switch —
"Élève ou enseignant" | "Administrateur ou gestionnaire" — in a centred
column under the heading.

- **The switch animates**: a navy highlight slides under the chosen tab; the
  cards cross-fade and slide, the first waiting off to the left and the
  second to the right; the frame eases to the new card's height (measured
  with a `ResizeObserver`, so an error message appearing also eases in).
  500 ms, ease-out. Reduced motion: instant.
- **Each tab is a link to its portal's URL.** Without JavaScript a click
  just loads that page. With it the switch happens in place and the address
  follows by `history.replaceState`, which Next's router tracks — refresh or
  bookmark lands on the card that was showing. The query the page arrived
  with (`?next=`, `?google=`) stays only on the card it arrived on, so a
  reader's `next` never rides along onto the staff card.
- **Semantics**: WAI-ARIA tabs — `tablist` named "Je me connecte en tant
  que", `tab` with `aria-selected`/`aria-controls`, `tabpanel` labelled by
  its tab; Left/Right arrows move and select. The hidden card stays mounted
  but `inert` (out of the tab order and the accessibility tree), so a
  half-typed username survives a look at the other card.
- **Books drift behind the page** instead of the illustration: nine outline
  books in the genre colours at 25 % opacity, in the side margins and below
  the content, clear of the header. Each floats and tilts on the shared
  `animate-drift` loop with its own angle, duration (11–18 s) and delay, so
  none move in step. The layout's outer frame spans the viewport and clips
  them, so no scrollbar appears. Still under reduced motion.

Verified in Edge:
- `/login/opac?next=/catalogue/compte` opens on the reader card. Clicking
  the staff tab moves the URL to `/login/gestion` with no query, and the
  frame was mid-ease at 200 ms (235 → 441 → 497 px). ArrowLeft returns to
  the reader card with `?next=` restored, focus on its tab. A typed username
  survives the round trip, and a refresh keeps the card shown.
- With JavaScript off, the staff tab navigates to `/login/gestion`, which
  renders the staff form.
- All nine books animate (the first moved ~16 px in 1.5 s). Reduced motion:
  `animation: none`.
- No horizontal scroll at 1280 and 375 px, light and dark. axe: no
  violations.

## Colours, home button, livelier backdrop (2026-11-18)

- **Each audience has its colour** — Shelf teal for "Élève ou enseignant",
  navy for "Administrateur ou gestionnaire" — on its tab (text and icon when
  not chosen), its card's frame and its card's icon block. The sliding
  highlight and the switch's border change to the chosen audience's colour
  as they move (500 ms; instant under reduced motion).
- **"Accueil" / "Home"** sits beside the language switch, styled like the
  catalogue header's "Se connecter" (navy, Rajdhani), leading to `/`.
- **Falling books** join the drifting ones: seven, one per lane across the
  page, on `animate-fall` (17–26 s, staggered), and they **dodge the
  pointer** — one coming within 110 px is pushed directly away, by up to
  260 px from its lane, easing over 500 ms. Hidden under reduced motion.
- **A drifting book shows a reading quote** when the pointer rests on it: a
  card beside the book, on the side facing the middle of the page, with a
  quote and its author drawn from `messages.quotes` (six per language, all
  well attested — Descartes, Montesquieu, Proust, Borges, Addison, G. R. R.
  Martin; Dr. Seuss and Zappa in English). Never the same quote twice in a
  row. The book brightens and grows while it is quoting.
- **How hover works behind the content**: the backdrop is `-z-10` under
  full-width content, which takes the real hover events, so the component
  follows the pointer at the window level (`pointermove`, batched per
  animation frame) and compares it against each book's live position.
  Quotes show only when the element under the pointer is bare background —
  never through a card or a heading a book has drifted behind. Mouse and
  pen only; touch has no hover. The quote card is `aria-hidden` and
  pointer-transparent, like the books: decoration, not content.

Verified in Edge:

- Tab colours compute to teal, then navy, after a switch, in light and dark.
  The home button leads to `/`.
- All seven falling books animate; one approached by the pointer moved
  ~47 px away.
- Resting on a drifting book shows a quote (Proust in the run); a second
  look shows a different one; over the card, none.
- Reduced motion: no falling books, drifting ones still. No horizontal
  scroll at 1280 or 375 px.
- axe: no violations, light and dark.

## On phones (2026-11-18)

- **Tabs** put the icon above the label, at body-small size, so "Élève ou
  enseignant" and "Administrateur ou gestionnaire" each fit their half.
- **The card's audience block becomes a slim band** — icon beside label,
  56 px tall instead of ~215 — since the tab above already names the
  audience and a tall block pushed the form below the fold.
- **The Google button and the staff "Se connecter" go full width**, 48 px
  tall; "Mot de passe oublié ?" gets a 44 px tap target.
- **The heading** steps down to `heading-2`.
- **The backdrop thins out**: the drifting books are hidden (no margins to
  keep them off the text, and touch cannot hover them for a quote), and
  only every other falling book is shown.

Verified at 375 and 390 px with touch emulation, on both cards: no
horizontal scroll, no input under 16 px, every tap target at least 44 px,
4 falling books and no drifting ones; desktop still shows all 16 and the
side-by-side icon block. axe clean.

## Phone bottom bar (2026-11-18)

The sign-in page on phones now matches the catalogue's (CDI request):

- **Header in one row**: the EFB logo alone, theme and language switches
  compacted on the right. "Accueil" leaves the header — it hides whenever
  the page has a bottom bar (`max-sm:[:root:has([data-dock])_&]:hidden`),
  so the forgotten-password page, which has none, keeps it.
- **The two sign-in tabs drop to a bar at the foot of the screen**, icon
  over label like "Découvrir" / "Rechercher", with "Accueil" on navy as the
  third item, as "Se connecter" is on the catalogue's bar. It is the same
  WAI-ARIA tab list, only placed differently (`sm:contents` dissolves its
  wrapper on larger screens), so arrows, `aria-selected` and the panels'
  labels behave as before. The highlight fills the chosen tab edge to edge
  in its colour; a light rule separates the navy staff tab from the navy
  "Accueil".
- **No heading on screen** (CDI request), as on the catalogue home: the
  `<h1>` stays for screen readers (`sr-only`).
- **The active card gets the screen**: the audience block is back to a
  big icon over its label (56 px), and the Google button and staff
  "Se connecter" are 56 px tall. The page is padded at the foot so the bar
  never covers the form.

Verified with an iPhone user agent at 390 px: header without the Shelf
lockup or "Accueil"; the bar pinned to the bottom with both tabs and
"Accueil"; teal highlight on the reader tab, navy after tapping the staff
tab (URL → `/login/gestion`, card 331 → 590 px); the bar's "Accueil" → `/`;
the forgotten-password page keeps "Accueil" in its header and has no bar.
Desktop: tabs above the card as before, header "Accueil" shown. axe clean
on both.

## Quieter backdrop and the monogram (2026-11-18)

- **Quotes only on wide screens** (≥ 80rem / 1280 px; CDI request): below
  that the margins are too narrow for a quote card, which landed on the
  form. The drifting and falling books still move; they just say nothing.
  Verified: hovering a drifting book quotes at 1440 px, not at 1024 px.
- **The header logo is the Shelf monogram** (see
  [02-design-system.md](02-design-system.md) "Logo"), so the sign-in page
  no longer loads Playfair.

## Not built from the mockup

- **"Continue with Google"** — since built for readers; see "Google
  sign-in for readers" above.
- The language selector and light/dark toggle visible in the dashboard
  mockups. Theme currently follows `prefers-color-scheme` with no manual
  override, and i18n is not scheduled.
