# Cataloguing (back office)

Phase 3. Staff create, edit and delete bibliographic records and the
physical copies hanging off them.

Legacy sources inspected: `catalog.php`, `catalog/notices/*.inc.php`
(`notice_form`, `update_notice`, `notice_create`, `notice_delete`),
`catalog/expl/*.inc.php` (`expl_update`, `del_expl`), `classes/notice.class.php`,
`classes/expl.class.php`.

## 1. What legacy does

### 1.1 The rules that actually matter

Under ~3 500 lines of `notice.class.php` and a form assembled from
templates, the enforced rules are few:

| Rule | Where |
|---|---|
| `tit1` (title) is mandatory — the only required field | `update_notice.inc.php:33` |
| Copy barcode must be unique, re-checked when changed | `expl_update.inc.php:26-46` |
| **A record with copies cannot be deleted** | `notice_delete.inc.php:52` |
| **A copy that is on loan cannot be deleted** | `expl.class.php:1189` |
| Custom fields validate against their definitions | `parametres_perso::check_submited_fields` |
| Per-record access rights, when `gestion_acces_active` | `notice_delete.inc.php:21` |

Everything else — 60-odd columns, UNIMARC subfields, Z39.50 import,
duplicate detection by signature, record locking while someone edits — is
optional machinery around those six.

### 1.2 Shapes worth knowing

- **Authors are not a field but a relation** with a *level* (main,
  secondary, subject-of) and a UNIMARC *relator code*: 070 author, 200
  illustrator, and so on. A record can have any number.
- **Publisher, collection and series** are authorities too, shared across
  records, not free text on the record.
- **A copy belongs to a record or to a serial issue**, never both.
- **Editing is locked** per record (`entity_locking`) so two librarians do
  not overwrite each other. Legacy shows the holder and offers to steal it.

## 2. What we keep, change, and drop

**Keep.** All six rules above except per-record access rights (no
authorization layer yet — deferred item 3.1). Keep authors as a relation
with level and relator code. Keep the record/issue exclusivity, which is
already a CHECK constraint in our schema.

**Change.**

- *Authorities are typed, not picked.* Legacy makes you open a search
  popup to attach an author. Here you type names — one per line, `Surname,
  Forename` — and an existing authority is reused, or created if new. Same
  for publishers and subjects. A librarian describing a book should not
  have to think about whether the author record already exists.
- *One form, not a wizard.* Legacy splits creation across a type chooser,
  a de-duplication step and the form itself. Ours is one page.
- *Uniqueness is enforced by the database.* Legacy SELECTs before INSERT,
  which races. `items.barcode` is already `@unique`; the code turns the
  violation into a field error rather than checking first.

**Drop for now** (recorded in [09-deferred.md](09-deferred.md)): UNIMARC
subfield-level editing, Z39.50 and external import, duplicate detection,
record locking, digital documents, and the ~40 descriptive fields nobody
in a school CDI fills in. The form carries what the catalogue actually
displays.

## 3. What we implement

**Records.** A searchable list, a create form and an edit form carrying:
title, subtitle, ISBN/EAN, publication year, document type, record status,
abstract, authors, publishers and subjects. Validation: title is required;
a year, if given, must be a plausible four-digit year.

**Copies.** Listed on the record they belong to. Add, edit and delete, with
barcode, call number, location, section and status. Refusals: a duplicate
barcode, and deleting a copy that is on loan.

**Deletion.** A record with copies refuses to delete and says how many are
in the way — the librarian deletes the copies first, which legacy also
required but explained less clearly.

## 4. What was built

| File | Role |
|---|---|
| `lib/cataloguing.ts` | Validation, authority resolution, both deletion guards. |
| `app/gestion/catalogue/page.tsx` | Searchable record list. |
| `app/gestion/catalogue/nouveau/` | Create form. |
| `app/gestion/catalogue/[id]/` | Edit form plus the copies editor. |

UX decisions:

- **Each copy is its own form.** Saving one copy never touches another, and
  a duplicate barcode fails that row alone. Legacy submitted the record and
  all its copies together.
- **Creating redirects to the record; updating stays put**, because after
  saving a new record the next thing you do is add a copy, and after an
  edit the next thing you do is another edit.
- **The delete button is always visible and explains its refusal.** Hiding
  it when copies exist would leave the librarian guessing.

## 5. How it was verified

26 checks against the live database: both validation rules, authority
round-tripping in order, existing authorities reused rather than
duplicated, links replaced rather than appended on update, duplicate and
missing barcodes, and both deletion guards — including that deleting a
copy on loan names the borrower. Then every action again through a real
request context, which confirmed an OPAC session cannot reach them (307 to
the login screen). Pages checked in both locales and both themes; a missing
record 404s.

This surfaced a data defect that predates the module: the `subjects` table
held two copies of every seeded label, from an older version of the seed.
Four orphans were deleted. Nothing in the current seed or in this module
can recreate them — both look up an existing label before creating one.

Driving the running app in a browser then found two defects that no
server-side test could have:

- **A validation failure wiped the form.** React clears an uncontrolled
  form once a function action returns, including when the action rejected
  the submission — so mistyping the year discarded the title, authors,
  subjects and abstract. Worse, the now-empty `required` title made the
  next submit fail silently in the browser, leaving the form unusable. The
  action echoes its values back and the form remounts on an attempt key.
- **"Copy saved" never appeared.** The blank add-a-copy form was keyed on
  the copy count; adding a copy grew the list, changed the key, remounted
  the form and destroyed the confirmation it had just produced. The key is
  now stable.

## 6. Open questions

- **Is Z39.50/BnF import wanted?** It is how most French CDIs catalogue —
  scan an ISBN and pull the record. Nothing here replaces it, and typing
  records by hand is slow. Probably the single most valuable thing to add
  after this module.
- **Do two librarians ever edit at once?** If so, record locking (or at
  least a stale-write check on `updated_at`) matters; today the last save
  wins silently.
- **Are subjects a flat list or a hierarchy?** We create flat labels.
  Legacy's `categories` is a tree with translations, which an authorities
  module would need to honour.
