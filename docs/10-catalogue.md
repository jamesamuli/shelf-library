# Module: public catalogue (search + record detail)

Phase 1 of [05-roadmap.md](05-roadmap.md). Steps 1–2 of the workflow in
[04-migration.md](04-migration.md): what the legacy module does, before any
code.

## Scope

**In:** keyword search over the catalogue, a results list with paging, and
the record detail page including holdings and availability.

**Out, deliberately:** browsing by subject/category is its own module (it
needs the thesaurus tree UI), as are facets, saved searches, the basket
(`cart.php`), reading lists, and reviews. One module at a time.

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

1. **Is subscriber-only visibility (`*_abon`) actually used?** The schema
   has no equivalent column yet, so this build treats every OPAC-visible
   record as public. Adding it later is one column plus one clause, but if
   the CDI relies on it the answer changes now.
2. **Implicit truncation threshold** — legacy uses "longer than 2
   characters". Keep as is unless the CDI has a preference.
3. **Indexing language** — legacy supports per-record indexing language.
   This build assumes French (`french` text-search config) throughout.

## 5. What was built

| Route | Purpose |
|---|---|
| `/catalogue` | Search + results, public |
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

### Performance

Warm, against the remote database: search ≈260 ms (one raw query), record
detail ≈1.6 s. The gap is Prisma's `include`, which issues a round trip per
relation — about eight of them. Recorded in
[09-deferred.md](09-deferred.md); the fix is to fetch the detail in one
query as the search already does.

### Verified

Search by title, author, subject and abstract; prefix truncation (`pest` →
*La Peste*); accent-insensitivity; multi-word cross-field AND; a query
matching nothing; the empty-results state; record detail with holdings and
a live due date; the not-found state; French and English; light and dark;
375 px with no page overflow.

Visibility was tested against the live database rather than assumed: a
status hiding a record removes it from both search and detail; a status
hiding only holdings keeps the record but empties its copies; hiding a
section removes those copies from the detail page and from the availability
counts in search. Each restored correctly afterwards.
