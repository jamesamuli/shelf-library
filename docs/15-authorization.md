# Authorization

Legacy reference: `includes/config.inc.php` (the bit constants),
`includes/sessions.inc.php::checkUser()` (the gate), `admin/users`.

## 1. What legacy did

`users.rights` is a 27-bit unsigned mask. `includes/config.inc.php` names the
bits — `CIRCULATION_AUTH = 1`, `CATALOGAGE_AUTH = 2`, `AUTORITES_AUTH = 4`,
`ADMINISTRATION_AUTH = 8`, up to `ANIMATION_AUTH = 33554432`.

Each module entry point declares one and only one:

```php
// circ.php
$base_auth = "CIRCULATION_AUTH";
```

`init.inc.php` evaluates that string into `$auth` and hands it to
`checkUser()`, which does the whole check in two lines:

```php
if ($allow) {
    if (! ($allow & $session->rights)) {
        $checkuser_type_erreur = CHECK_USER_AUCUN_DROITS;
        return FALSE;
    }
}
```

**One test, at the door, per module.** Anyone who could open Circulation could
do everything inside it — there is no second check before a deletion. The nav
was assembled from the same mask in `includes/misc.inc.php`, so the menu
matched the bits, but that was presentation, not a control.

Two bits are *subtractive* rather than additive:
`RESTRICTCIRC_AUTH` and `RESTRICTCATAL_AUTH`. `circ.php` blanks `$categ`
unless it is `pret` or `retour`, confining that user to the desk.

There are no roles. Every account carries its own hand-edited mask in
`admin/users`, so nobody can say what "the assistant's access" means without
reading the bits.

## 2. What we built

**Permission keys, not bits.** `lib/permissions.ts` names seven capabilities
and `role_permissions` stores them as text, so "who can delete a record" is a
SQL question. Seven, not twenty-seven: they name what this application can
actually do today. The rest of legacy's bits guard modules we do not have.

| Key | Covers |
| --- | --- |
| `circulation.loan` | Check out, check in, renew at the desk |
| `circulation.override` | Force past a refusal — quota, non-loanable copy, renewal limit |
| `holds.manage` | Reservations and the reshelving worklist |
| `readers.manage` | Enrol readers, bulk import, the CSV template |
| `catalog.edit` | Create and edit records and copies |
| `catalog.delete` | Delete records and copies |
| `staff.manage` | Staff accounts and role assignment |

**Roles are the unit you assign** (`lib/roles.ts`): Administrateur,
Bibliothécaire, Aide-documentaliste. The last is legacy's `RESTRICTCIRC_AUTH`
expressed positively — the desk and reservations, no deletions, no overrides.
`scripts/sync-roles.ts` brings the table in line with the file and is
idempotent; it deliberately never touches who holds which role.

**Checked per action, not per module.** Legacy tested once at the door; every
Server Action here re-checks. `requirePermission()` throws rather than
returning a boolean, so an action that reaches its body is authorized and
there is no result for a caller to forget to check.

**Read fresh, never from the cookie.** `permissionsFor()` queries on every
request. Baking permissions into the session would mean a revoked role kept
working until the user next signed in, which for a security control is the
wrong default. React's `cache()` dedupes within a request, so a page checking
five permissions still costs one query.

**`force` is a claim, not an authorization.** The desk's "check out anyway"
button posts `force=1`. That field is attacker-controlled, so the action
reduces it against the permission:

```ts
const force = formData.get("force") === "1" && granted.has("circulation.override");
```

Hiding the button is cosmetic; this line is the control.

**The nav shows only what the account can open**, as legacy's did — a link
that leads to a refusal is worse than no link. Pages and actions re-check
regardless; hiding is never the enforcement.

**Refusal is a panel, not a 404.** Next 16 has `forbidden()`, but it is
experimental and needs `experimental.authInterrupts`. We had just spent four
deploys on a config flag breaking the Vercel build, so this renders an
"Accès refusé" panel instead — no experimental surface, and a French message
that tells the reader to ask whoever manages accounts. Hiding the screen's
existence would leave a librarian unable to tell whether the feature is
missing or they are.

**You cannot remove the last administrator.** `setRoles()` refuses a change
that would leave nobody holding `staff.manage`; there is no recovery path from
inside the app and the fix would be a database script. Legacy had no such
guard.

## 3. What this cost us to get right

The staff screen failed to build: `staff-table.tsx` is a Client Component and
imported `PERMISSIONS` from `lib/permissions.ts`, which imported Prisma —
`Module not found: Can't resolve 'dns'`. The permission *catalogue* is now
pure data in `lib/permissions.ts`, and the *lookup* lives in `lib/staff.ts`
with the rest of the server-only code. Worth recognising on sight: a
`"use client"` file may not reach a module that touches the database, however
innocent the imported value looks.

## 4. How it was verified

Eleven domain assertions: each role resolves to exactly the expected key set;
an unknown key sitting in `role_permissions` grants nothing; the last-admin
guard refuses.

Then driven in a browser as two different accounts — twenty checks. A
restricted account sees only the sections it may open, and is refused readers,
cataloguing, record editing, the staff screen **and the CSV template route**
by direct URL, not merely by a hidden link. It sees no override button. An
administrator reaches everything, and unchecking every role on the only admin
row produces the refusal rather than a lockout.

## 5. Open questions

- **Per-location rights.** Legacy's `admin/acces` adds a second layer:
  per-location and per-category ACLs on top of the bitmask. Out of scope for a
  single-site CDI; revisit only if the school runs more than one collection.
- **No audit trail.** Nothing records who deleted a record. Legacy had
  `audit.php`; we do not.
- **Staff accounts cannot be created or disabled from the UI.** The screen
  assigns roles to accounts that already exist; adding one is still
  `scripts/create-admin.ts`. Deliberate — account creation needs a password
  policy and a delivery story, and neither exists yet.
- **Patron-side permissions are untouched.** `PatronStatus.allowsLoan` /
  `allowsHold` / `allowsRenewal` already gate what a reader may do; they are a
  separate mechanism and stay that way.
