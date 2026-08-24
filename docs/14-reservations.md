# Reservations

Under Circulation. Three views, matching legacy's tabs: **En cours**,
**Dépassées**, **Documents à ranger**.

Legacy sources inspected: `circ/listeresa/main.inc.php`,
`classes/reservations/reservations_circ_controller.class.php` and its
`_outdated_` subclass, `classes/list/reservations/list_reservations_ui.class.php`,
`circ/do_pret_resa.inc.php`, `classes/ajax_pret.class.php` (`del_resa`).

## 1. The rules, and where they come from

**The current/overdue split is legacy's, verbatim**
(`list_reservations_ui.class.php:830`):

| Tab | Legacy | Here |
|---|---|---|
| En cours | `resa_date_fin >= CURDATE() or = '0000-00-00'` | `expiresOn >= today OR expiresOn IS NULL` |
| Dépassées | `resa_date_fin < CURDATE() and <> '0000-00-00'` | `expiresOn < today` |

The subtlety worth keeping: an **unset end date means no copy has been
assigned yet**, so the reader is still waiting rather than late to collect.
Legacy encoded that as `0000-00-00`; we use `NULL`, which is what it meant.

**A reservation is on the title, not the copy.** Legacy reserves a `notice`
and assigns a `resa_cb` later, so scanning a barcode to place a hold only
identifies the title. Ours does the same.

**`empr_statut.allow_book` → `PatronStatus.allowsHold`**, checked before a
reservation can be placed.

**Documents à ranger is legacy's `resa_ranger`**: copies pulled off the shelf
for a reservation that has since gone away, and which therefore have to be
physically put back. Legacy inserted into it from `del_resa` and cleared it
on loan or on a barcode scan. Here it is the `reshelving_items` table, with a
real foreign key rather than a loose barcode string.

## 2. What changed

- **`Hold.itemId` is a real reference** (migration `20260812120000_holds_desk`),
  where legacy carried `resa.resa_cb` as an unconstrained string. A copy can
  no longer be deleted out from under a waiting reader.
- **Cancelling only flags a copy for reshelving if nobody else wants it.**
  Legacy tried to reassign the barcode and fell back to `resa_ranger`; the
  same intent, expressed as a query rather than a chain of side effects.
- **A copy set aside must be a copy of the title reserved, and must not
  already be promised to someone else.** The barcode is typed at the desk, so
  it can be any copy in the building; legacy constrained `resa_cb` to the
  reserved notice, and nothing stopped us assigning one copy twice. Both are
  now refused by name — `ITEM_WRONG_TITLE` and `ITEM_ALREADY_SET_ASIDE`, each
  message quoting the barcode so the librarian knows which copy is at fault.
- **Converting a reservation to a loan reuses `checkOut`**, so the desk's
  refusal rules apply unchanged — one implementation of "may this be lent",
  not two.
- **No pickup-location routing, no reservation planning, no transfers.**
  Legacy's `resa_loc_retrait` / `resa_planning` / `transferts` machinery is
  out of scope; `pickupLocation` exists on the model and is displayed, but
  nothing routes on it.

## 3. The `get_expl_info()` trap

Legacy's copy display (`includes/expl_info.inc.php:253`) inner-joins a copy
against `docs_location`, `docs_section`, `docs_statut`, `docs_type` and
`docs_codestat`. If any one of those is empty, the join returns nothing and
the screen says **"Exemplaire inconnu"** — blaming the barcode for what is
actually a missing reference row.

Every join in `lib/holds.ts` is a `LEFT JOIN` (Prisma `select` on an optional
relation), and every reference field falls back to `"—"` in `toView`. A copy
whose location has been deleted renders with a dash where the location goes;
it does not vanish, and it never reports itself as unknown.

## 4. How it was verified

30 checks against the live database covering: placing, the duplicate refusal,
unknown reader and unknown copy, a status that forbids reservations, the
waiting state, assigning a copy that is on loan versus one that is free, the
pickup window, the current/overdue split either side of the boundary, the tab
counts, cancelling, the reshelving flag and its clearing, the case where a
second reader is still waiting (no reshelving), and converting to a loan
including the refusals before a copy is assigned and after fulfilment.

Then driven in a browser: the three tabs, placing from the desk form, the
duplicate and unknown-reader refusals, the waiting state, assigning a lent
copy versus a free one, and the pickup window.

That drive exposed one real defect. **Row-scoped feedback cannot work here.**
Lending or deleting a reservation takes it out of the list, so the row — and
the confirmation it had just produced — unmounted before anyone could read
it. The whole list now shares one action state with the message above the
table, so the confirmation outlives the row it is about. (The same defect
class as the copies editor in [12-cataloguing.md](12-cataloguing.md); worth
recognising on sight.)

A later pass over the whole app found two more, both in `assignCopy`: it
accepted a copy belonging to a **different title**, and it would promise **one
copy to two waiting readers**. Neither is visible from the screen — the row
simply shows a copy that cannot satisfy it. The second one only surfaced once
the probe used a copy that was actually on the shelf, because `ITEM_ON_LOAN`
had been masking it; the first probe run reported it as passing. Both are
covered by assertions now, and both refusals were then confirmed in the
browser rather than only at the function boundary.

## 5. Open questions

- **Who places reservations in practice?** There is a desk form, because the
  screen would otherwise be unreachable, but in legacy readers place their own
  from the OPAC. That belongs to the OPAC module and does not exist yet.
- **Should a returned copy trap itself for the next reader?** Today check-in
  is unaware of reservations: a librarian assigns copies by hand. Legacy
  raised an alert on return. This is the most valuable next step.
- **Should an overdue reservation expire itself?** Nothing moves a hold to
  `EXPIRED`; the Dépassées tab is a worklist a human clears.
- **Pickup locations** are displayed but do not route anything.
