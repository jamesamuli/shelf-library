# Demonstration data

`prisma/seed-demo.ts` fills the database so every screen has something to
show: the OPAC home's carousel and Découvrir tiles, search, the desk, the
reservations and the reader files. It builds on `prisma/seed.ts` (reference
rows: statuses, the CDI location, the two reader categories), so run that
first, then:

```
npm run seed:demo
```

It is idempotent. Records are matched by title, readers by card number, and
the circulation is drawn once, the first time the demo readers have no
loans.

## What it creates

| | |
| --- | --- |
| **Records** | 100, from `prisma/demo-catalogue.json`: 16 novels, 16 fiction (fantasy, SF, crime), 14 comics and manga, 12 picture books, 10 plays, 10 tales and poetry, 16 non-fiction, 6 magazines. Every one has a summary, one to three paragraphs long, and one genre. The six records from the base seed get a genre too. |
| **Authorities** | Authors (with dates where known), publishers, series with volume numbers, French subjects, Dewey indexes with their shelf labels. |
| **Copies** | One to three per record, 183 in all, in five sections (Romans et fictions, Bandes dessinées, Albums, Documentaires, Périodiques), with a call number built as a CDI shelves them: `R FAY`, `BD SAT`, `842 MOL`, `398.2 PER`. Each magazine's first copy is for consultation on site. |
| **Readers** | 28 pupils across seven classes (6ème to Terminale) and 5 teachers, enrolled for the 2026–2027 school year. |
| **Circulation** | 28 open loans, 7 of them overdue; 45 returned loans over the last four months; and 4 reservations: two waiting for a title whose every copy is out, one with a copy set aside, one queued behind a loan. |

Records are dated over the last four months in a shuffled order, so the
new-arrivals row mixes genres. The titles the demo accounts borrow are dated
oldest, so a loan never predates its copy.

## The three demonstration accounts

They follow legacy PMB's model: staff are Gestion users with rights, while
teachers and pupils are readers, set apart by their category's loan rules
(legacy `empr_categ`).

| Account | Where | Access |
| --- | --- | --- |
| **Administrateur**: `administrateur` (Patrick Niyonzima) | Gestion | The Administrateur role, i.e. every permission, staff accounts included (`lib/roles.ts`). Password from `SEED_ADMIN_PASSWORD`, or generated and printed once. |
| **Enseignant**: card `P-2026-0100` (Claire Hakizimana) | OPAC | "Enseignant" category: no loan quota, 28-day loans. Has three loans and a copy of *L’Arabe du futur* set aside. |
| **Élève**: card `E-2026-0100` (Kevin Irakoze, 4ème C) | OPAC | "Élève" category: three loans at most, 14 days each. One loan due soon, one overdue, and a reservation queued on *Harry Potter à l’école des sorciers*. |

Readers sign in with their school Google account only (docs/08), so the
two OPAC accounts need real `@efbujumbura.com` addresses. They come from
`SEED_TEACHER_EMAIL` and `SEED_STUDENT_EMAIL`. Without them the readers
still exist at the desk, but nobody can sign in as them. Re-running with
the variables set adds the addresses. They are never written in the file,
because the repository is public.

## Covers

The OPAC builds a cover from the ISBN (Open Library). A wrong ISBN shows
another book's cover, which is worse than the Shelf placeholder, so the
ISBNs were not typed from memory. Each one was looked up on Open Library and
kept only when:

- the edition is in French;
- it has a real cover;
- its title matches the record.

The 75 that passed were then checked by eye on a contact sheet, and three
more were dropped: study guides ("Profil d’une œuvre") filed under *Les
Fleurs du mal* and *Éthiopiques*, and a counting book under *Le Petit
Prince*. That leaves 72 records with a cover, less *Madame Bovary*, whose only match
turned out to be an abridged German school edition: 71. The other 29 keep no ISBN and
show the placeholder.

Publisher and year are those of the first French edition, as typed. Open
Library's edition data was too noisy to trust ("Not Avail", school editions
from German publishers). The ISBN may therefore belong to a later
paperback.

## Deliberately not done

- **No translators or illustrators** as separate contributions. The OPAC
  lists every contributor beside the title, and a translator there reads as
  a co-author. Picture-book author–illustrator pairs are both entered as
  authors, which is how they are credited on the cover.
- **Magazines are one record each**, with no issues (`Issue`). Nothing in
  the OPAC or at the desk handles issues yet.

## Additions (2026-11-22)

- **Author biographies**: `prisma/demo-authors.json` holds 98 short
  biographies, keyed `name|forename`. They are written into `authors.comment`
  only where it is empty, so a biography the CDI has written is never
  replaced. They keep to well-established facts: dates, nationality, best-
  known works and major prizes.
- **The administrator's password survives a re-run.** Re-running the seed
  to add data used to generate a new password for `administrateur`, which
  locked out whoever was using the old one. It now keeps the current
  password unless `SEED_ADMIN_PASSWORD` is set.
- **Page counts** for 58 records, from Open Library by ISBN (`pages` in
  `demo-catalogue.json`, written to `page_count`).
- **Publisher descriptions**: `prisma/demo-publishers.json`, 45 short texts,
  written only where `publishers.comment` is empty.
