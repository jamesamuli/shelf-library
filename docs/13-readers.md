# Readers: enrolment and bulk import

Under Circulation. Enrol one reader, or import a whole class from a file.

Legacy reference: `circ/empr/`, `classes/emprunteur.class.php`, the `empr`
table and its `empr_categ` / `empr_statut` / `empr_codestat` satellites.

## 1. The one deliberate departure: email first

Legacy PMB starts a reader with the **barcode**. That made sense when the card
was printed first and the reader was whoever held it. In a school it is the
other way round: every student already has an institutional address, it is
unique, it is known before they ever visit the CDI, and it is what they will
type to sign into the catalogue.

So the form starts with the **email**, and:

- the email becomes the **OPAC login** by default, editable if needed;
- the **barcode** moves second and is generated (`E-<year>-NNNN`) unless the
  librarian types one;
- both email and login are `UNIQUE` in the database, as the barcode already
  was, and the form reports a clash as a field error rather than a failed
  insert.

`Patron.email` gained its unique index in
`20260812090000_school_classes`.

## 2. Decisions

**"Classe" is its own table** (`school_classes`, `Patron.schoolClassId`).
Legacy filed it under `empr_codestat`, a shared statistical-code table; our
`StatisticalCode` is item-scoped and mixing the two would file "6ème B"
alongside item reporting buckets. Custom fields (`Patron.customFields`) were
the other candidate and were rejected: nothing validates them yet, they can't
be joined or indexed cleanly, and a class is not an optional extra — it is how
the population is organised and how the import is structured. A closed list is
also what lets the import say *"Classe inconnue"* instead of silently
accepting a typo.

**Passwords were never in question.** `Patron.passwordHash` has held scrypt
hashes since the authentication module; plaintext is not a representable
state. Legacy's `empr_password_is_encrypted` was deliberately not carried
over, and there is no compatibility risk because the PHP OPAC does not read
this database.

What the import does raise is that a new reader has **no password**:
`verifyCredentials` refuses OPAC sign-in when `passwordHash` is null. An
enrolled or imported reader can therefore borrow at the desk immediately but
cannot sign into the catalogue until a password is set. The form says so.
Setting one in bulk is deferred (item 3.2 in [09-deferred.md](09-deferred.md)).

**Membership dates follow the school year**, not
`PatronCategory.membershipDurationDays`. 1 September → 31 August, computed
from today (before September we are still in the previous year), pre-filled
and editable. A CDI's year is a calendar fact, not a per-category duration;
the category duration stays in the schema for non-school deployments.

**Gender and note** had no column and gained one
(`20260812091000_patron_gender_notes`): legacy `empr_sexe` as `'F'`/`'M'`/null
and `empr_msg` as `notes`. **`empr_lang` was dropped** — the OPAC language in
pmb-next is a device preference (a cookie), not a property of the reader.

## 3. The import

**CSV only, by decision.** Real `.xlsx` parsing needs a dependency and a
French spreadsheet exports CSV natively. What that costs us is handled
explicitly: `parseCsv` sniffs `,` versus `;` from the header line, strips a
UTF-8 BOM, handles quoted fields and CRLF, and the template is served *with* a
BOM so Excel on Windows doesn't reopen it as Latin-1 and turn "Élève" into
"Ã‰lÃ¨ve".

Columns: `email` (required), `nom`, `prenom`, `classe`, `code_barres` (blank →
generated), `sexe`, `date_adhesion`, `date_expiration` (blank → school year;
both `JJ/MM/AAAA` and `AAAA-MM-JJ` accepted), `categorie`, `statut`. Class,
category and status are matched **by label**, accent- and case-insensitively,
because that is what a librarian types.

**Preview, then import.** Nothing is written until the librarian confirms.
Every row is judged first and shown with its verdict: missing name, malformed
address, unknown class, invalid date, duplicate within the file, address or
barcode already registered.

**Partial import, reported.** Confirming imports the valid rows in a single
`createMany` and returns the rejected ones as a table plus a downloadable CSV
to fix and re-submit. Blocking 397 good rows because 3 are bad is the wrong
trade for a whole-school file, and nothing is silent because the preview
already showed every rejection. If *no* row is valid, nothing is written and
the screen says so.

Confirming re-reads and re-judges the submitted text rather than trusting the
preview round-trip, so the file is validated by the server on the write path
too.

## 4. How it was verified

Driven in a real browser: the school-year dates pre-fill, a duplicate barcode
is refused without losing what was typed, an auto-generated card number is
issued and shown, a duplicate email is refused, the template downloads, a
nine-row file with six deliberate faults previews as 3 valid / 6 rejected with
the right reason on each, confirming imports exactly 3, the rejected rows are
offered as a file, and the circulation desk still works afterwards.

The imported rows were then read back from the database: barcodes issued
sequentially (`E-2025-0012…0014`), login equal to email, classes resolved
through their accented labels, category and status resolved where given, the
row that carried its own dates keeping them while the others took the school
year, gender parsed, and `passwordHash` null throughout.

One defect was found this way, and it is worth remembering: **the template
download was a `<Link>`**. A client-side navigation to a route handler makes
the router believe the page *is* that route, so the next Server Action POSTed
to it and got a 405 — the import silently never ran. It is a plain `<a
download>` now.

## 5. Open questions

- **Do classes need a school year?** Today `school_classes` is a flat list of
  labels, so "6ème B" is the same row every year and students are reassigned.
  If year-on-year reporting is wanted, the class needs a year and the import
  needs to know which one it is filling.
- **Should enrolment set a password?** Currently not. The alternatives are
  generating one per reader and returning it in the import report, or a
  first-sign-in flow via the school address.
- **Should the import update existing readers** rather than rejecting them?
  Re-importing a class at the start of a year would then move everyone up a
  class in one step. Today an already-registered address is a rejection.
