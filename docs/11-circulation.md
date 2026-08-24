# Circulation (loans)

Phase 2, first half. Check-out, check-in, renewal, and the patron's own
loan list. Holds (legacy `resa`) are a separate module — see the end of
this file.

Legacy sources inspected: `circ.php`, `circ/pret.inc.php`,
`circ/pret_func.inc.php`, `circ/prolongation.inc.php`,
`circ/do_pret_resa.inc.php`, `classes/ajax_pret.class.php`,
`classes/ajax_retour_class.php`, `opac_css/classes/pret.class.php`,
`opac_css/empr/all.inc.php`, `includes/trap/trap_pret.xml`.

## 1. What legacy does

### 1.1 Check-out is a chain of "traps"

Legacy's whole loan policy is one ordered list of checks, declared in
`includes/trap/trap_pret.xml` and executed by `do_pret::check_pieges()`.
Each returns OK, a **blocking** error, or a **forceable** error — the
librarian can override the latter with a second click.

| # | Trap | Rule | Blocking? |
|---|---|---|---|
| 1 | `emprunteur_exist` | patron exists | blocking |
| 2 | `document_exist` | item exists | blocking |
| 3 | `emprunteur_adhesion_false` | membership not expired | blocking |
| 4 | `document_pretable` | item status has `pret_flag` | **forceable** |
| 10 | `document_has_todo` | item awaiting processing | **forceable** |
| 5 | `document_has_note` | item carries a note | **forceable** |
| 6 | `document_already_loaned` | already out to *this* patron | blocking |
| 7 | `document_already_borrowed` | out to *someone else* | blocking, or auto-return |
| 8 | `document_has_resa_false` | held for someone else | **forceable** |
| 9 | `quotas` | loan count limit | config decides |
| 11 | `document_is_trusted` | patron had this title recently | **forceable** |

Trap 7 has a config switch (`pmb_pret_already_borrowed`): when on, scanning
an item that is out to another patron silently returns it first and lends
it to the new one. Convenient at a busy desk, invisible in the audit trail.

The loan is written **twice**: `add_pret()` inserts a temporary row with
`pret_retour = 'today()'` — the literal string, not the function — and
`confirm_pret()` deletes it and inserts the real one. An abandoned
check-out leaves the temporary row behind.

### 1.2 Due date

`confirm_pret()`, in simple (non-quota) mode:

1. duration = `docs_type.duree_pret` — a property of the **document type**,
   not the patron;
2. due = today + duration;
3. unless `pmb_pret_date_retour_adhesion_depassee`, the due date is
   **capped at the patron's membership expiry**;
4. if the opening calendar is enabled, the due date rolls forward to the
   next open day (or back to the last open day when capped).

### 1.3 Renewal

Two different implementations that do not agree.

**Gestion** (`circ/prolongation.inc.php`) refuses when a pending hold
exists on the title, or when `cpt_prolongation` exceeds
`pmb_pret_nombre_prolongation`; both are forceable. Note line 54: the
counter only increments when the loan did not start today, so same-day
renewals are free.

**OPAC** (`pret::is_extendable()`) adds six more refusals: short loans
never renew, membership must be current, the new date must actually be
later, an overdue-notice level blocks renewal, holds block renewal only if
the number of free copies is below the number of waiting holds, and — the
one patrons complain about — renewal is only allowed inside a window of
±`opac_pret_duree_prolongation` days around the due date.

### 1.4 Check-in

`ajax_retour_class::do_retour()`: find item by barcode, find the loan,
compute lateness in **open days** via the calendar, optionally block the
patron for `days × coef` capped at `blocage_max`, optionally debit a fine,
then `DELETE FROM pret` and write a row to `pret_archive`.

## 2. What we keep, change, and drop

**Keep.** The trap chain, as an ordered list with the same
blocking/forceable split — it is a genuinely good model, and the ordering
matters (identity before policy, cheap before expensive). Keep the
membership-expiry cap on the due date. Keep the overdue-notice level.

**Change.**

- *Duration source.* Legacy reads it from the document type. Our schema
  carries `patron_categories.loan_duration_days`, and a school CDI varies
  duration by reader (pupil vs teacher) more than by media. Resolution
  order is therefore **patron category → `DEFAULT_LOAN_DAYS` (14)**.
  Making it vary by document type as well is an open question below.
- *One write, not two.* No temporary row. A loan row exists only if the
  loan happened. The partial unique index `one_active_loan_per_item`
  makes double-lending impossible at the database level rather than by
  trap 6 winning a race.
- *Append-only.* Check-in sets `returned_at`; it does not delete. Legacy's
  `pret`/`pret_archive` split is gone, so history and current loans are
  one table and cannot disagree.
- *Renewal has one implementation.* The same rules serve both portals,
  differing only in who may invoke it: staff can renew anything, a patron
  is additionally subject to `patron_statuses.allows_renewal` and the
  renewal limit. No ±window — refusing to renew a book because the reader
  was too early is a legacy quirk, not a policy.
- *Auto-return on trap 7 is dropped.* Silently returning another patron's
  loan to make a scan succeed loses information. It refuses, and the
  librarian returns the item explicitly.

**Drop for now** (recorded in [09-deferred.md](09-deferred.md)): fines and
patron accounts (no financial module), the opening calendar (no
`ouvertures` table), blocking-on-overdue, short loans, loan-trust warnings
(trap 11), item notes and processing flags (traps 5 and 10 — the columns
exist but nothing sets them), SIP2/RFID, and group loans.

## 3. What we implement

Check-out refusals, in order — the ones marked *override* offer a
"lend anyway" confirmation to staff:

1. patron not found → blocking
2. item not found → blocking
3. patron expired, blocked, or `allows_loan = false` → blocking
4. item status `allows_loan = false` → **override**
5. item already out to this patron → blocking
6. item out to another patron → blocking
7. loan quota reached (`patron_categories.loan_quota`) → **override**

Check-in: find item by barcode, find the active loan, set `returned_at`,
report lateness in calendar days. Returning an item that is not out is a
message, not an error.

Renewal: refuse when the patron's status forbids it, when
`renewal_count >= MAX_RENEWALS` (2), or when the new date would not be
later than the current one. Staff may override the count; patrons may not.

## 4. What was built

| File | Role |
|---|---|
| `lib/circulation.ts` | All rules. Refusals are codes, never sentences. |
| `app/gestion/layout.tsx` | Staff shell; the session guard lives here, once. |
| `app/gestion/page.tsx` | Dashboard: five counters plus recent loans. |
| `app/gestion/circulation/` | The desk: patron, check-out, loans, check-in. |
| `app/catalogue/compte/` | Patron's own loans, history, self-renewal. |
| `lib/dates.ts` | Locale-aware, UTC-pinned date formatting. |

UX decisions that depart from legacy:

- **The desk is one screen, not four modes.** Legacy's `circ.php?categ=`
  switched the whole page between lending, returning and renewing. Check-in
  needs no patron, so it sits in its own column and stays reachable while a
  patron is open.
- **The open patron is in the URL** (`?patron=<card>`), so the dashboard can
  link straight to a reader and a desk can be bookmarked or reloaded.
- **Overrides are a second button, not a second page.** Legacy sent you to a
  URL with `&force_pret=1`. Here the refusal and its override sit together,
  and the override only appears for refusals that allow it.
- **The barcode field clears and keeps focus** after each success, because
  the desk workflow is scan-scan-scan. React clears an uncontrolled form
  after a function action, so the override is a sibling form replaying the
  echoed barcode.

## 5. How it was verified

Against the live database, not assumptions: 33 checks over the refusal
chain, both loan durations, the membership cap, quota and its override, the
renewal limit and staff override, lateness in days, and double check-in.
Then the same paths through the action layer in a real request context,
which additionally showed that an OPAC cookie cannot drive a desk action
(307 to the login screen) and that a patron cannot renew a loan that is not
theirs. Pages were checked in both locales and both themes.

Two defects were found and fixed this way. `force` waived the renewal limit
for anyone who passed it, not just staff — it is now tied to `asStaff`. And
a reference copy counted as "available" in search results and rendered green
on the record page; availability now excludes copies whose status forbids
loans.

Driving the running app in a browser afterwards found three more:

- **Renewing an overdue loan produced a due date still in the past.**
  Renewal extends from the due date so that renewing early never shortens a
  loan, but for a loan 40 days overdue that landed 26 days *before* today.
  It now extends from the later of the due date and today.
- **A patron with a long history could lose sight of their current loans.**
  One query ordered by `returned_at` fed both lists, and Postgres sorts
  NULLs last on ASC — so open loans came after returned ones and a `take`
  limit would eventually cut them off. Current and returned loans are now
  fetched separately.
- **The desk put the cursor in the wrong box.** Check-out and check-in both
  set `autoFocus`, and the later one won, so opening a patron to lend them
  something focused the returns field. Focus is now explicit.

## 6. Open questions

- **Should loan duration vary by document type as well as patron
  category?** Legacy did it by type only. Adding
  `document_types.loan_duration_days` is a one-column migration if the CDI
  wants DVDs to lend for less time than books.
- **Does the CDI want blocking on overdue?** Legacy could bar a late
  reader for `days × coef`. The schema has `patrons.blocked_until` and the
  check-out path already honours it; nothing sets it.
- **Holds are the other half of Phase 2** and are their own module: they
  touch the OPAC record page, the check-in path (trapping a returned copy
  for the next in line), and the check-out path (trap 8). Building them
  inside this module would have meant two modules at once.
