# Module: public catalogue (search + record detail)

Phase 1 of [05-roadmap.md](05-roadmap.md). Steps 1–2 of the workflow in
[04-migration.md](04-migration.md): what the legacy module does, before any
code.

## Scope

**In:** keyword search over the catalogue, a results list with paging, and
the record detail page including holdings and availability.

**Out, deliberately:** browsing by subject/category is its own module (it
needs the thesaurus tree UI), as are facets, saved searches, the basket
(`cart.php`), reading lists, and reviews. One module at a time. (Later: the
landing page and its genre filter — [16-opac-home.md](16-opac-home.md).)

## 1. Legacy implementation

| Concern | Where |
|---|---|
| OPAC entry / routing | `opac_css/index.php` |
| Search form | `opac_css/includes/simple_search.inc.php` |
| Query parsing | `classes/analyse_query.class.php` |
| Search execution | `classes/searcher.class.php`, `classes/searcher/` |
| Result list | `opac_css/includes/search_result.inc.php` |
| Record display | `classes/mono_display.class.php` |
| Holdings list | `opac_css/includes/expl_list.inc.php` |

## 2. Business logic

### Search

- Terms are matched against a **word dictionary** (`words` / `mots`), not
  against the record columns directly. A separate inverted index
  (`notices_mots_global_index`) maps word → record, with a per-field
  weight (`pond`).
- **Truncation**: `*` in a term becomes SQL `%`. In addition, when
  `allow_term_troncat_search` is on, any term longer than two characters
  gets implicit right-truncation — searching `biblio` also matches
  `bibliothèque`. Stopwords (`get_empty_words()`, per indexing language)
  are excluded from that.
- **Relevance**: every criterion produces `(notice_id, pert)`. Multiple
  criteria are `INNER JOIN`ed — so criteria are ANDed — and their `pert`
  values are **summed**. Final order is
  `ORDER BY pert DESC, notices.index_sew`, i.e. relevance first, then the
  normalised sort title as a stable tie-break.
- Terms within one criterion are ORed, which is why the legacy help says
  results are ranked by how many of your words matched.

### Visibility — the rule that governs every query

A record appears in the OPAC only when its status allows it:

```sql
notice_statut.id_notice_statut = notices.statut
AND (
      (notice_visible_opac = 1 AND notice_visible_opac_abon = 0)
   OR (notice_visible_opac = 1 AND notice_visible_opac_abon = 1)  -- signed-in only
)
```

So `notice_visible_opac` is the master switch and `*_abon` narrows it to
signed-in patrons. The same pattern exists for holdings
(`expl_visible_opac`, `expl_visible_opac_abon`) and for digital documents.
This predicate is repeated by hand in a dozen files — a good example of
what a single query layer should own instead.

Holdings have two further filters of their own: an item is listed only when
`docs_section.section_visible_opac = 1` **and**
`docs_statut.statut_visible_opac = 1`. An item in a hidden section or
status is invisible even on a visible record.

### Availability

`expl_list.inc.php` does `LEFT JOIN pret ON exemplaires.expl_id =
pret.pret_idexpl`. Because legacy's `pret` table is keyed by item id, the
presence of a joined row *is* the "on loan" flag — there is at most one.
Whether an item may be borrowed at all is `docs_statut.pret_flag`; whether
it may be reserved is `docs_statut.statut_allow_resa`.

## 3. What we keep, change, and drop

**Keep** — these are deliberate rules, not accidents:

- Relevance-then-title ordering.
- Implicit right-truncation on terms longer than two characters. It is why
  the legacy catalogue feels forgiving, and dropping it would feel broken.
- Status/section visibility gating, including for holdings.
- Availability derived from loan state, not stored on the item.

**Change:**

- **Search moves to PostgreSQL full-text.** The `words` dictionary,
  `notices_mots_global_index` and the `index_*` columns are replaced by a
  generated `tsvector` + GIN index, so it cannot drift from the source
  (see [07-target-schema.md](07-target-schema.md)). Weighting moves from
  `pond` to `setweight` — title A, author/subject B, notes C. Relevance
  becomes `ts_rank_cd`, still tie-broken by sort title.
- **Visibility becomes one shared predicate** in the data layer rather
  than being retyped per query.
- **The results list gets availability inline.** Legacy makes you open a
  record to find out whether anything is on the shelf.

**Drop for now:** external-source federated search (`connectors_sources`),
Z39.50, and the multi-source selector — deferred per
[09-deferred.md](09-deferred.md).

## 4. Open questions

1. ~~Is subscriber-only visibility (`*_abon`) used?~~ **Answered: yes,
   keep legacy behaviour.** Implemented — see "Subscriber-only visibility"
   below.
2. **Implicit truncation threshold** — legacy uses "longer than 2
   characters". Keep as is unless the CDI has a preference.
3. **Indexing language** — legacy supports per-record indexing language.
   This build assumes French (`french` text-search config) throughout.

## 5. What was built

| Route | Purpose |
|---|---|
| `/catalogue` | Search + results, public; the bare URL redirects to the home at `/` |
| `/catalogue/[id]` | Record detail with holdings, public |
| `/catalogue/compte` | Patron account (moved here so `/catalogue` could be public) |

Data layer: `lib/catalogue.ts`. Full-text migrations:
`20260808030000_catalogue_search`, `20260808040000_unaccent_search`.

### UX changes over legacy

- **Search is a GET form**, so a result set is a real URL — shareable,
  bookmarkable, back-button friendly, and working without JavaScript.
  Legacy POSTed and kept state in the PHP session, making results
  unlinkable.
- **Availability shows in the results list**, not only on the record.
- **Accent-insensitive search.** `etranger` finds *L'Étranger*. Typing
  French without accents is normal and legacy did not handle it.
- The holdings table scrolls inside its own container on narrow screens
  rather than breaking the page.

### Two bugs found by testing, both user-facing

1. **`etranger` returned nothing.** `to_tsvector('french', …)` does not
   strip accents. Fixed with a `french_unaccent` text search configuration
   (`unaccent` + `french_stem`). `unaccent()` is STABLE, not IMMUTABLE, so
   it cannot be called directly in a GENERATED column — a custom
   configuration is the supported route.
2. **`camus peste` returned nothing.** Terms were ANDed *within* each
   vector, so an author term and a title term could never both match: the
   author name lives only in the author vector. Now every term must match
   *somewhere* on the record — own text, an author, or a subject — and the
   term predicates are ANDed across those. Author-plus-title is the most
   natural query a reader makes.

### Subscriber-only visibility

Legacy's `notice_visible_opac_abon` / `expl_visible_opac_abon` are kept, as
`record_statuses.is_record_subscriber_only` and `.are_items_subscriber_only`
(migration `20260808050000_subscriber_only_visibility`).

They **narrow** the master switch, they do not override it. A record is
public when it is OPAC-visible and not subscriber-only; it appears for a
signed-in patron when both flags are on. The same pair governs holdings
independently, so a record can be public while its copies are not.

Both catalogue queries take an `isSubscriber` flag derived from the OPAC
session, so an anonymous visitor and a signed-in patron genuinely see
different result sets rather than the UI hiding rows after the fact.

### Performance

Record detail was ≈1.6 s warm because Prisma's `include` issues a round trip
per relation — about eight. It is now a single query that aggregates
authors, publishers, subjects and holdings in SQL, the same shape search
already used.

Warm, against the remote database:

| | before | after |
|---|---|---|
| Search | ≈260 ms | ≈300 ms |
| Record detail | ≈1.6 s | ≈320 ms |

### Verified

Search by title, author, subject and abstract; prefix truncation (`pest` →
*La Peste*); accent-insensitivity; multi-word cross-field AND; a query
matching nothing; the empty-results state; record detail with holdings and
a live due date; the not-found state; French and English; light and dark;
375 px with no page overflow.

Subscriber-only was tested against the live database: a subscriber-only
record returns 0 search hits and a hidden detail page for an anonymous
visitor, and 1 hit with a visible page once signed in; a holdings-only
restriction keeps the record public while its copies disappear for
anonymous visitors.

Visibility was tested against the live database rather than assumed: a
status hiding a record removes it from both search and detail; a status
hiding only holdings keeps the record but empties its copies; hiding a
section removes those copies from the detail page and from the availability
counts in search. Each restored correctly afterwards.

## 6. Results page redesign (2026-11-21)

Laid out after a reference design the CDI supplied (a modern PMB OPAC
theme), kept plainer.

**What it does**

- **Filters down the left**, as tiles in the Découvrir style:
  - **Support**: the document type. Only types that hold records are listed.
  - **Genre**: the eight home genres.
  - A chosen tile is tinted and ticked; choosing it again lifts the filter.
    Filters combine (AND).
  - The active ones also show as removable chips under the count, with
    "Effacer les filtres" when there are two.
- **A results panel** (teal border, light teal tint): "Résultats de
  recherche", the search field, and "Résultats : 1 à 12 sur un total de
  106", plus « pour … » when there are words.
- **Numbered pagination** above and below the list (first, last, current
  ± 1, gaps as "…"). The two `nav`s are named apart for screen readers.
- **Display toggle** (Étendu / Liste) and **Trier par**:
  - The sorts are pertinence, title, author, newest and publication year.
    These are legacy `sort_by`'s options, plus "newest".
  - Pertinence is offered, and is the default, only when there are words
    to rank. Without words the default is title.
  - Every sort breaks ties on the title, accent- and case-folded
    (`unaccent(lower(title))`). "Éthiopiques" therefore files under E, not
    after Z.
- **Detailed card**:
  - Position "n/total", the cover (or the Shelf stand-in), the title, the
    authors in teal, publisher and year, series and volume, language
    (named via `Intl`) and ISBN.
  - Top right, the type and genre beside a bookmark ribbon in the genre's
    colour.
  - Under the cover, **"Localiser le document"** with the count available,
    leading to the copies on the record (`/catalogue/[id]#exemplaires`),
    and the call number of a copy to fetch (an available one first). When
    every copy is out, the same button is outlined and reads "Tous
    empruntés".
- **List view**: one line per record, with title, author · year · type,
  availability and call number.
- 12 per page (legacy `opac_search_results_per_page`), as in the design.
- Each state is a URL (`q`, `genre`, `support`, `tri`, `vue`, `page`), and
  only non-default values are written. A filter or sort change returns to
  page 1; switching views keeps the page.

**Smaller screens**

- **Below `lg`** the filters fold into a "Filtres (n)" disclosure above the
  list. It is keyed on the filters, so it closes again once a choice has
  loaded.
- **Phones**:
  - The layout's bottom bar stays.
  - The view toggle shows icons only, and the sort select shrinks to fit.
  - The pagination becomes previous / "Page x sur y" / next.
  - The card puts the cover at 6 rem beside the text, with the locate
    button across its foot.

**Data**: `searchCatalogue` takes an options object.
- It picks the page's ids first, with `row_number()` over the chosen order,
  so the per-record lookups (publisher, languages, first genre, call
  number) run for twelve rows, not for every match.
- `listDocumentTypes()` feeds the Support filter.

**Verified** in Edge against the live demo data:
- 1440 px light/FR: 12 cards, the filters column, pagination "1 2 … 9".
  - Sorting by newest goes to `tri=recent`.
  - Support BD gives 14 results; adding Romans gives 0, with two chips;
    "Effacer les filtres" clears both.
  - The list view keeps page 2.
  - "camus peste" gives 1 result, sorted by pertinence.
  - "Localiser" lands on the copies, scrolled into view.
- 1280 px dark/EN: comics filter, ticked tile, chip.
- 900 px: the disclosure opens, choosing Théâtre loads 10 results and the
  disclosure is closed.
- 390 px: no horizontal scroll (one fix was needed: the toolbar was 11 px
  too wide), and the bottom bar is present.
- axe clean in all three.

**Not done**: no counts beside the filters, so a combination can give
nothing (BD + Romans). See docs/09-deferred.md.

## 7. Cards, copies, reservations, likes, authors (2026-11-22)

CDI requests, after a second reference image (PMB's copies dialog).

**Detailed card (from `sm`)**
- The cover fills the card's left side: no locate button or call number
  under it any more. Pointing at the card zooms it slowly inside its frame.
- On the right:
  - the title;
  - the **authors, each a link to their page**;
  - the summary (4 lines);
  - language, ISBN and call number (the cote, with a pin);
  - then **Localiser le livre**, **Réserver le livre**, and the availability.
- The type/genre ribbon stays top right.

**Localiser le livre** opens a dialog after the reference image:
- the title in a teal bar with a round close button;
- "n exemplaire(s) trouvé(s)" and what the call number is for;
- one row per copy: copy number (barcode), call number, location ·
  section, availability badge (available / on loan until… / the reference
  status), acquisition date.

The copies come with the results (`holdingList`, shared with the record
page), so the dialog opens without a round trip. The reference's page-size,
search box and paging are left out: a title has one to three copies.

**Réserver le livre**
- **Signed out**: a link to the OPAC sign-in with
  `next=<this list>&reserver=<id>`. On the way back, the confirmation opens
  by itself and the parameter is removed from the URL.
- **Signed in**: the confirmation opens straight away.
- The reservation is always placed by the confirm button, never by a URL.
- `reserveTitle()` (lib/holds.ts) is legacy `resa::can_reserve()` in its
  order:
  - the status allows reservations (`allow_book`);
  - the record is visible and has a copy that can be lent;
  - the reader has not already reserved it (`resa_exists`);
  - the reader does not already have it on loan (`allready_loaned`).
- Legacy's quotas, post-loan waiting period and per-location rules are not
  carried over, for lack of their machinery.

**Phone card** (Instagram-style, CDI request):
- The cover across the screen, with the document type as a large teal tag.
- Under the cover:
  - **the heart**: likes;
  - **the paper plane**: recommend. It opens the phone's share sheet with
    the book's link and a sentence, or copies the link, and stores nothing;
  - **the bookmark**: reserve, the same flow as above.
- Then the like count, the title, the authors (links), three lines of
  summary and the availability.

**Likes** (CDI decision: both favourites and a public count):
- The `record_likes` table (migration `20261122090000_record_likes`) holds
  one row per reader and record.
- The heart turns at once; the server confirms, or it turns back.
- Signed out, the heart leads to the sign-in.
- The reader's likes are "Mes favoris" in their account.

**Author page** `/catalogue/auteur/[id]`:
- The name, dates, biography and website (shown only if http(s)).
- Every book of theirs the CDI holds, with the same cards and paging.
- The biography is the author authority's `comment`, legacy's
  `author_comment` (CDI decision: written by the CDI, not fetched). The demo
  seed fills 98 short biographies (`prisma/demo-authors.json`), only where
  the field is empty.
- Authors are links on the record page too.

**Mon compte** gains "Mes réservations" (waiting / to collect by …) and
"Mes favoris". The reservation confirmation points there.

**Verified** in Edge, with a locally signed test session for the demo
pupil:
- Signed out:
  - The card shows one author link, the summary and both buttons.
  - The reserve link carries `next=/catalogue?q=&tri=recent&reserver=17`.
  - The locate dialog lists 2 copies and closes.
  - The author page shows J. K. Rowling's biography and her 2 books.
  - Phone: the tag reads LIVRE, the heart leads to sign-in, no overflow.
- Signed in:
  - `?reserver=<id>` opens "Réserver « Le Petit Prince »" and drops the
    parameter; confirming gives the success message.
  - Reserving *Petit Pays*, already on loan, is refused by name.
  - The heart goes 0 → 1 and holds after a reload.
  - The account lists the favourite.
- axe is clean on the results, the dialog, the author page and the phone.
- The account page shows one pre-existing issue (see docs/09-deferred.md
  8.3).
- The test reservation and like were removed afterwards.

## 8. Sign-in dialogs, author dialog, plainer phone card (2026-11-22, later)

CDI requests, for an OPAC used by pupils as much as by the librarian.

- **No page change to like or reserve while signed out.**
  - A dialog says why an account is needed, in plain words. Reserving: the
    CDI keeps the book in your name and tells you when it is ready. Liking:
    your favourites are kept in your account.
  - It names the school address and offers the school Google sign-in right
    there (`SignInPrompt`, reusing the sign-in page's popup button).
  - The popup brings the reader back to the same list carrying
    `reserver=<id>` or `aimer=<id>`.
  - The reservation then waits for its confirm button, since it commits the
    library to something. The like is applied on arrival: it was asked for,
    is harmless, and is undone with a tap. (This settles 09-deferred 8.5.)
  - Without Google configured, the dialog links to the sign-in page instead.
- **Authors open a dialog, not a page**, on the cards (desktop and phone)
  and on the record page. It shows the dates, the biography and up to eight
  of their books with cover and availability, plus "Voir tous ses livres"
  when there are more.
  - The content is fetched on first open (`authorCardAction`).
  - The name stays a real link to `/catalogue/auteur/[id]`, used without
    JavaScript, for a new tab, and for "see all".
- **A heart on the desktop card**, bottom right, with its count.
- **The phone card**:
  - **The cover.** It carries the desktop card's ribbon, in the same genre
    colour with the same icon, larger, without the words (still read by
    screen readers).
  - **The icons.** The heart has its bare count beside it, then "recommend"
    and the reservation's bookmark-plus.
  - **The title.**
  - **"En savoir plus".** A native disclosure that opens the authors, the
    whole summary and the availability in place.
- **Each heart is keyed on its saved state.** After any like the server
  refresh remounts it, so a card's desktop and phone hearts never disagree.

**A bug worth knowing.** The first version wrapped the author names in a
`<p>`, and each name carries its `<dialog>`. A paragraph may not contain
one: the browser split it and React failed to hydrate, which silently
stopped the like-on-return effect. The names now sit in a `div`.

**Verified** in Edge:
- Signed out, desktop:
  - Each dialog opens without the URL changing: the like prompt (Google
    `next` carries `aimer=103`), the reserve prompt and Saint-Exupéry's
    dialog with his book.
  - axe is clean with each dialog open and closed.
- Phone, 390 px:
  - The ribbon shows, the heart reads "0", and "En savoir plus" opens.
  - Rowling's dialog opens from inside it, as does the reserve prompt.
  - No overflow; axe clean.
- Signed in:
  - `?aimer=103` likes the book (0 → 1) and drops the parameter; undone
    afterwards.
  - `?reserver=103` opens the confirmation, on desktop and on phone.

## 9. Plainer sign-in dialog, folding genre, language filter (2026-11-22)

CDI requests.

- **The sign-in dialog shows only the essentials, centred.**
  - The heart (liking) or the bookmark (reserving), large and in a
    gradient: raspberry to plum, or Shelf teal to indigo. It beats with
    `animate-heartbeat` (two beats and a rest; none with reduced motion).
  - One short sentence: "Connectez-vous pour aimer ce livre" or "…pour
    réserver ce livre".
  - Which account to use (the school's @efbujumbura.com address).
  - The Google button.
  - The "Annuler" button and the longer explanations went. The small cross,
    Escape and a tap outside still close it.
  - `Modal` gained this bare form: no `title`, a narrow card, and the
    content carries its own heading.
- **Genre folds** into a disclosure in both layouts, the longest group
  shortened. It starts open when a genre is chosen, and the chosen one is
  named beside the heading ("Genre · Romans").
- **A language filter**: Français, Anglais, Espagnol, the three the CDI
  collects. It shows as pills, uses `langue=fre|eng|spa`, and reads the
  record's languages (`record_languages`). It has a chip like the other
  filters, and the phone's "Filtres" panel closes after a choice.
  - The demo catalogue is all French, so English and Spanish list nothing
    yet. The six base-seed records had no language at all and were missing
    from "Français"; the demo seed now gives them French (also applied to
    the database).
- **The phone card's icons now sit under the title and "En savoir plus"**,
  above a thin rule, rather than under the cover.
- "Effacer les filtres" is in full-contrast text: the teal caption on the
  tinted panel failed axe once two filters were active.

**Verified** in Edge:
- 1440 px:
  - The prompt shows only heading, hint and Google button, centred, with
    the beating icon; axe clean, and in dark too.
  - Genre is closed at first and opens on a click.
  - Anglais gives 0; Français gives 106 after the language fix (100
    before); Français
    + Romans gives 16, with Genre open and reading "Genre · Romans".
- 390 px:
  - Title above "En savoir plus" above the icons.
  - Espagnol from the panel gives 0, and the panel closes.
  - No overflow; axe clean.

**Toned down, and smoothed (same day).**
- The heartbeat is softer and calmer: peaks of ×1.06 and ×1.05 (were
  ×1.16 and ×1.13), on a 2.4 s cycle (was 1.6 s).
- Genre, the phone's "Filtres" panel and "En savoir plus" now slide open
  and shut (`details-smooth` in globals.css: `::details-content` animated
  from 0 to `auto` with `interpolate-size`). Browsers without it open at
  once, as before, and reduced motion opens at once too.
- A catch worth knowing: the Genre `<details>` is a flex column (`stack`),
  where an item keeps an automatic minimum height equal to its content. It
  therefore jumped open until the content got `min-block-size: 0`.
- Measured in Edge:
  - Genre 58 → 390 → 499 → 526 px over about 0.35 s;
  - "Filtres" 50 → 374 → 506 px;
  - "En savoir plus" 44 → 136 → 211 px;
  - no overflow at 390 px.

## 10. Search inside the phone sheet; back without reloading (2026-11-22)

CDI requests.

- **The phone's search sheet shows its results itself.**
  - Submitting replaces the tips with the results, which scroll inside the
    sheet: cover, title, authors, availability.
  - "Voir les n résultats" appears when there are more than twelve.
  - Tapping a book opens it (the dock closes the sheet on any link).
  - The results stay when the sheet is closed and reopened, or after coming
    back from the book. Emptying the field brings the tips back.
  - It runs on `sheetSearchAction`, the same search and visibility rules as
    the results page.
  - Without JavaScript the form still goes to the results page.
    (`search-sheet.tsx`; `SearchBar` gained `onSubmit`/`onChange`.)
- **"Retour au catalogue" goes back, not to a fresh page**, on the record and
  author pages, as a visible button.
  - When the previous history entry is on this site, read through the
    Navigation API, it calls `router.back()`. The router restores that page
    from its cache, with its filters and at its scroll position.
  - Otherwise (a shared link, a new tab, a browser without the API) it opens
    the whole catalogue, as before.

**Verified** in Edge:
- Phone, from the home:
  - "camus" gives 2 results in the sheet; the URL stays `/`, the tips are
    gone, axe is clean.
  - "histoire" gives 12, and the sheet scrolls.
  - Picking one closes the sheet and opens the book. Back, the sheet still
    holds the 12; emptying the field shows the tips.
- Desktop:
  - From `?genre=romans` scrolled to 1600 px, open a book and go back: the
    same URL, scroll 1600 px, and **0** requests for the list.
  - Opening a record directly and pressing the button goes to the whole
    catalogue.

## 11. Search as you type, breadcrumb, book page, list view (2026-11-22)

CDI requests, after two more reference screens: PMB's record page and its
list entry.

- **Search as you type**, on the results page and in the phone's sheet.
  - **The cost, measured first.** Prisma Postgres bills per database
    operation. A results-page update costs about 4 (rows, count, genres,
    types) and a sheet search 2. One update per keystroke would make
    "harry potter" about 12 updates.
  - **So the list follows only:** after a 400 ms pause, from 3 letters,
    never twice for the same words, and a late answer to older words is
    dropped. Enter searches at once.
  - Typing "camus" at a normal pace caused **one** update, about what
    pressing Enter costs.
  - Results-page updates **replace** the URL, so Back still leaves the
    catalogue. (`live-search.tsx`)
- **Emptying the field returns to the list before the search**, the field's
  own cross included: filters, sort and page as they were. Verified:
  `genre=romans&page=2` → type "camus" → clear → `genre=romans&page=2`.
  Having arrived with words already (a search from the home), there is no
  earlier list, so it shows the whole catalogue with the filters kept.
- **Breadcrumb**, "Accueil › Catalogue › …", on the results, book and author
  pages. On a book or an author, "Catalogue" goes back to the list the
  reader left, as before; it replaces the standalone "Retour au catalogue"
  button, which said the same thing. (`breadcrumb.tsx`)
- **Book page**, after the reference:
  - The title, then a card: cover with "Localiser le livre" and the
    availability; the type and genre ribbon; the authors (each opening
    their dialog); "Publié en 1946 · La Table ronde"; the collation; the
    whole summary.
  - Then language, ISBN, EAN (computed from an ISBN-10 if need be), call
    number, Dewey class with its shelf label, series and volume,
    collection, edition.
  - Genre and subject chips, each a search.
  - Reserve, the heart and "recommend".
  - Below the card, every copy in the same table as the "Localiser" dialog
    (`CopiesTable`). Its scroll area is focusable and named for keyboard
    users on a phone.
  - `getRecord` now returns the collation, edition, volume, cover,
    languages, the genre's icon and colour, the Dewey label and the likes.
- **List view**, after the reference, a few dense lines per record:
  - **title** | type | genre | year | language | Auteur(s) : … | Éditeur : …
  - Collation : …
  - Cote : … | ISBN : … | EAN : …
  - n exemplaire(s) · availability.
  - Labels are bold in Shelf teal, separators a light bar.

**Left for later:**
- The demo records have no collation (page count), so that line does not
  show yet. Open Library knows it for the 71 editions whose covers we use,
  and could fill it, free.

**Verified** in Edge:
- Live search: one update for "camus", and clearing restored the URL above.
- The sheet found "harr" without Enter.
- Breadcrumb "Catalogue" from a book returned to `genre=theatre&vue=liste`
  at its scroll position (400 px); "Accueil" goes home.
- Book page at 1440 / 390 / dark: axe clean after the fixes below; no
  overflow.
- Two fixes found by testing:
  - The ribbon's wrappers had taken a cell of the card's grid, pushing the
    cover into the wide column; they are `display: contents` now.
  - Genre chips were teal on a teal tint (contrast); they are solid now.

## 12. Collation, publisher dialog, book page trimmed, genre ribbons on the home (2026-11-22)

- **Collation from Open Library (free).** 58 of the 71 demo editions with an
  ISBN have a page count on Open Library ("215 p."). It is stored in
  `page_count`, and also kept in `demo-catalogue.json` as `pages` so the seed
  reproduces it. It shows on the book page and as "Collation" in the list
  view.
- **Publisher dialog**: the publisher under the call number opens a dialog
  like the author's. It shows the town, a short description
  (`publishers.comment`) and up to eight of its books with covers.
  - "Voir tous ses livres" opens the catalogue filtered by publisher
    (`editeur=<id>`, with its chip).
  - The author and publisher dialogs are now one component (`EntityName`,
    `EntityCard`).
  - The demo seed writes 45 short publisher descriptions
    (`demo-publishers.json`), only where none exists.
- **What it costs.**
  - Opening a dialog is one server action, about three database
    operations (the publisher, its books, their count), and only when a
    reader opens one. No AI.
  - The descriptions are the CDI's text. If they should be drafted for new
    publishers, the cataloguing assistant could do it like the author
    biographies: one grounded Gemini request per new publisher, cached and
    capped. Publishers recur, so that is a handful a month, a few cents a
    year. Not built.
- **Book page, desktop**:
  - "Localiser le livre" is gone: the copies are listed under the card.
  - The availability sits beside "Réserver le livre".
  - "Éditeur" appears under the call number, opening the dialog.
  - "Recommander" is gone.
- **Book page, phone**:
  - The big title above the card is gone. It stays for screen readers, and
    the visible title follows the cover.
  - The cover fills the card's width.
  - "Réserver", the heart and "Recommander" share one row.
  - The copies heading reads "· 2 disponible(s)" in Shelf green, on both
    sizes, instead of the copy count.
- **Home carousel**: each new arrival carries its genre's ribbon in its
  colour, as in the catalogue: large on a phone's full-screen card, small on
  the desktop row. It replaces the teal document-type tag. `Ribbon` now has
  three sizes: `labelled`, `large`, `small`.

**Verified** in Edge:
- *Petit Pays*, desktop: no locate or share button; the action row reads
  "Réserver le livre · 2 disponible(s) · ♡ 0".
- Grasset's dialog shows its description and its one book; axe is clean
  with the dialog open.
- Gallimard: "Ses livres au CDI (10)", then "see all" gives `editeur=5`,
  10 results and a "Gallimard" chip.
- The list entry shows "Collation : 215 p.".
- Phone: the cover is 340 of the card's 342 px; the three actions are on
  one line; no overflow; axe clean.
- Home: 15 ribbons on desktop and on phone; axe clean.

**Fixes (same day).**
- **"Catalogue" in the breadcrumb sent a phone reader home.** A book opened
  from the home (the carousel, the search sheet) has the home behind it,
  and the crumb went back there. It now goes back only when the previous
  entry is a list of the catalogue (`/catalogue`), and otherwise opens the
  whole catalogue.
- **List view: the whole row is the link to the book**, and greets the
  pointer (or keyboard focus) with `animate-nudge`: a quick zoom and tilt
  that settles back to rest, none with reduced motion.
  - The CDI asked for 15°. A row spans the page, so at 15° its ends would
    sweep about 230 px over the rows around it. The tilt is 1.5°; the
    keyframes are in globals.css if a stronger one is wanted.
- **Book page: the availability shows once**, beside "Exemplaires", no
  longer also beside "Réserver".

Verified:
- Phone: home → sheet → book → "Catalogue" goes to `/catalogue?q=`; from
  `genre=romans` it still returns to that list.
- Hovering a row runs `nudge` once and ends at rest (no rotate, no scale);
  a click on its publisher text opens the book.
- "disponible(s)" appears once on the book page; axe clean.

## 13. View switch without reloading, loading bar, clickable cards (2026-11-23)

CDI requests, all on the results page unless noted.

- **The list view's animation is slower and eased.** `nudge` now takes
  1.1 s with `ease-in-out` on each half (it was 0.5 s, `ease-out`), peaking
  at 1.015 and 1.5°.
- **The view is a preference, not part of the URL.**
  - The server renders both views of the page; the switch
    (`ResultViews`) shows one or the other. The records are already there,
    so switching is instant: no request, no new page.
  - The choice is kept in a `catalogue-view` cookie, so the next page of
    results, a reload or Back from a book open in the same layout.
  - `vue=` still works (the switch's links without JavaScript, old links)
    and overrides the cookie for that page. The client then removes it
    from the address on the next switch.
  - Cost: the page's HTML holds both layouts (12 records twice), and there
    is not a single extra database operation.
- **Phones have no list view.** The switch is hidden below `sm`, and the
  cards are shown whatever the cookie says.
- **A loading bar while a page is on its way.**
  - It is a thin teal bar running along the top of the screen.
  - It is shown for pagination, filters, the filter chips, live search,
    and opening a book from a card or a row.
  - It is built on `useLinkStatus` (`PendingBar`, placed inside each link
    and moved to the body so a row's tilt cannot carry it along). Live
    search and the clickable cards use their transition's `pending`
    state instead.
  - It fades in only after 150 ms, so quick answers never flash it. With
    reduced motion it is a still bar.
- **The detailed card (desktop) opens the book wherever it is clicked**:
  the cover, the summary, the empty space.
  - These keep their own job: the authors (their dialog), the buttons,
    the dialogs they open, and a text selection.
  - The title remains the real link, for the keyboard, screen readers, a
    new tab, and pages without JavaScript.
  - The card wrapper (`ClickableCard`) only widens the target for the
    pointer. On hover the border turns teal and the title underlines.
  - The cover is no longer a separate link.
- **Home** (docs/16-opac-home.md): Découvrir ends with a full-width tile,
  "Découvrir tout le catalogue", which leads to `/catalogue?q=`. It is on
  the home only, not in the phone's genre sheet.

Verified in Edge:
- Liste ⇄ Étendu: 0 requests, the URL is unchanged, and the cookie is set.
- Page 2 and Back from a book stay in the list view.
- The bar shows while page 2 loads, then disappears.
- Phone with the cookie set to `liste`: 12 cards, 0 rows, no switch.
- Clicking a card's summary or cover opens the book; clicking an author
  opens the dialog and stays on the list.
- The home tile is as wide as the genre grid (578 px) and leads to the
  whole catalogue.
- axe is clean everywhere.

## 14. English abstracts, loading mark, narrow phone filters (2026-11-23)

- **The abstract follows the interface language** (CDI request).
  - Records have a second, optional abstract, `abstract_en` (migration
    `20261123090000_abstract_en`).
  - `abstractFor(record, locale)` picks it in English and falls back to
    the French one. It is used on the cards (desktop and phone) and on the
    book page.
  - Search still runs on the French abstract only.
  - The cataloguing side is in docs/18-author-enrichment.md (step 5); the
    demo data in docs/17-demo-data.md.
- **A loading mark in place of the thin bar**, a CDI trial: the bar was
  too easy to miss.
  - It is the Shelf mark on a small card in the middle of the screen, its
    three books hopping in turn (`ShelfMark hopping`, `animate-book-hop`).
  - It fades in after 150 ms and lets clicks through. It is rendered into
    the body, so no ancestor's tilt or clipping moves it.
  - `LinkLoader` goes inside links (`useLinkStatus`); `PageLoader` is shown
    directly by live search and the clickable cards.
  - With reduced motion the books stay still.
- **Phone filters: a narrower panel at the right** (max 18rem, `ml-auto`),
  closed and open.
  - The filter tiles now go to two columns by the panel's own width
    (container query `@md`), not the screen's. The narrow panel and the
    desktop aside both get one column.
  - The panel opens with a visually hidden h2, "Filtrer la recherche", so
    its h3 groups no longer skip a level (axe `heading-order`, seen once
    the panel was open).

Verified in Edge:
- "Petit Pays" shows its French abstract in French and its English one in
  English, on the card and on the book page.
- Page 2 delayed by 1.5 s: the loader appears with its 3 hopping books, in
  both themes, and is gone once the page has arrived.
- Phone filters: 288 px wide, flush right, one column, no overflow.
- Desktop aside: one column.
- axe clean.

## 15. Catalogue UX pass (2026-11-23)

CDI-approved items from the UX review (6, highlighting, was left out).

- **"Disponible maintenant"** (`dispo=1`): only records with a copy on the
  shelf, loanable and shown in the OPAC.
  - It uses the same test as the "available" count (`onShelf` in
    `searchCatalogue`).
  - It is the first filter, styled as a switch but built as a link, like
    every filter. It has its own chip.
- **The number of results per option.**
  - Each type, genre and language shows what it would give, with the
    other filters as they are. "Disponible maintenant" shows its count
    too.
  - An option that would give nothing is dimmed and is not a link.
  - Counted in one extra query (`withFacets`): each matching record is
    flagged once per filter, then counted per facet leaving that facet's
    own filter out.
  - Cost: one more database operation per results page (about 5 instead
    of 4).
- **A compact header.**
  - The title and the count share one line; then the search; then the
    chips, only when there are some.
  - The top pagination is gone.
  - The live search's "Recherche…" now sits inside the field, and stays a
    status for screen readers. Before, it kept an empty line in the
    header.
  - The band is about 167 px tall on desktop.
- **A sticky toolbar.**
  - The view switch, "1–12 sur 106" and the sort stay at the top while
    the list scrolls.
  - On phones the sort is at the right and narrower (max 10rem).
- **Phones get "Revenir en haut"** after 1.5 screens of scrolling, above
  the bottom bar.
- **Réserver is the filled button, Localiser the outlined one**, and
  Réserver comes first. Inverted at the CDI's request, since reserving is
  the reader's main action. The book page's Réserver changes with it (same
  component).
- **No results: ways out.** The page offers:
  - one chip per active filter, to lift it;
  - "Chercher « … » dans tout le catalogue", or "Voir tout le catalogue";
  - the genres.
- **Phones: "Voir plus de livres"** instead of pages (`page=N&suite=1`).
  - The server renders pages 1 to N as one list, from one query with a
    larger LIMIT.
  - The link keeps the scroll position, so the next books appear beneath
    the reader.
  - The URL can be shared, and Back works.
  - From `sm` up, the pagination stays.
- **The loading screen** (`RouteLoader`, mounted once in the OPAC layout).
  - It shows the Shelf mark, large, with its books hopping, over the page
    blurred behind it.
  - It shows at once and stays at least 900 ms, then fades out (CDI
    request: long enough to be seen, even when the page is already
    there).
  - Links start it through `LinkLoader`, and the clickable cards through
    `useRouteLoader`.
  - Live search does not use it: blurring the page at every pause in the
    typing would get in the way.
- **Phone filters are back to full width**, as before §14 (CDI request:
  the narrow panel at the right was not wanted). The container-query
  columns stay.

Verified in Edge:
- The facet counts add up (Livre 74 + Revue 6 + Album 12 + BD 14 = 106).
- "Disponible maintenant" shows 97, and switching it on gives 97 results
  and a chip.
- `langue=eng` gives 0 results, with 13 options dimmed.
- After scrolling, the toolbar is at top 0.
- Réserver is filled and comes before Localiser.
- Page 2: the loader shows, then is gone once the page is there.
- Phone:
  - "Voir plus" gives `page=2&suite=1`, 24 cards, and the same scroll
    position.
  - "Revenir en haut" brings the reader back to the top.
  - The filters are full width; the sort is 160 px, at the right.
- No results: the chip, the "search everywhere" link and the genres.
- axe is clean on every page tested, the phone filters open included.
