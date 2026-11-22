# Module: OPAC home (new arrivals + browse by genre)

The app's entry point: the page served at `/`, before any search. Visual
reference requested by the CDI: the Hibouthèque (Réseau Canopé) school
catalogue — welcome heading, a carousel of new arrivals with covers, a
search panel beside a grid of colour-coded genre tiles. We take that
**layout**, not its branding: Shelf logo, palette and type throughout.

## 1. Legacy implementation

| Concern | Where |
|---|---|
| Home composition | `opac_css/includes/index.inc.php` |
| Latest records | `opac_css/includes/last_records.inc.php` |
| Cover URL | `opac_css/includes/misc.inc.php` (`opac_book_pics_url`) |
| Section browser (nearest thing to tiles) | `opac_css/includes/show_localisation.inc.php` |

Legacy's home is a stack of optional blocks, each behind an `opac_show_*`
parameter: info pages, the search form, a thesaurus browser, newsletters
(`bannettes`), a section browser with pictures, two Dewey browsers
("marguerite des couleurs", "100 cases du savoir"), latest records,
virtual shelves, RSS.

## 2. Business logic

### Latest records ("dernières notices")

```sql
SELECT notice_id FROM notices, notice_statut
WHERE statut = id_notice_statut AND <OPAC visibility>
ORDER BY create_date DESC, notice_id DESC
LIMIT $opac_show_dernieresnotices_nb
```

- "New" means **most recently catalogued**, by creation date — not
  acquisition date, not publication date.
- The same OPAC visibility predicate as search applies, including
  subscriber-only records appearing once a patron is signed in.
- `notice_id DESC` is the tie-break for records created in the same
  second (bulk imports).

### Covers

A record shows its own `thumbnail_url` when set. Otherwise legacy builds
one from a URL template (`opac_book_pics_url`) by replacing `!!isbn!!`
with the record's ISBN/EAN stripped of dashes and dots. No ISBN and no
thumbnail means no cover.

### Genre

Legacy PMB has **no genre field**. CDIs express it through subjects, a
custom field, or the section an item is shelved in — all of which
conflate things: a documentary *about* theatre carries the subject
"Théâtre" but is not a play, and a section is a property of a copy, not of
the work. The tiles therefore need a dedicated, controlled list.

## 3. What we keep, change, and drop

**Keep.**

- Latest records by creation date with the id tie-break, under the shared
  visibility predicate.
- Cover rule: own thumbnail first, else ISBN-derived, else none.

**Change.**

- **Genres become a first-class list** (`genres`, `record_genres`): a
  record can carry several (a comic can be both *Bandes dessinées* and
  *Fictions*). Each genre holds its own tile label (FR/EN), icon and
  colour, so tiles are changed as data, not code. Seeded with the eight
  from the CDI's reference: Bandes dessinées, Romans, Albums, Fictions,
  Théâtre, Contes et poésie, Livres documentaires, Revues et magazines.
- **Cataloguers tick genres on the record form**, which is the only way a
  tile can ever return anything.
- **A tile is a search filter**, `/catalogue?genre=<slug>`, so a genre view
  is a real URL and can be combined with keywords.
- **Availability on the new-arrival cards**, as a badge on the cover.
- **The ISBN cover source is Open Library** (`covers.openlibrary.org`),
  free and keyless. It answers a missing cover with a blank image, so the
  placeholder underneath shows through without any JavaScript.
- **Covers are cached** (CDI request, 2026-11-18). Straight from the
  browser, one Open Library cover was two redirects across two hosts,
  ending in an image extracted from a zip archive — 6–8 s each, kept by
  the browser for only 3 hours. They now go through Next's image
  optimiser (`remotePatterns` for `covers.openlibrary.org/b/isbn/**` in
  `next.config.ts`): the server fetches each cover once, keeps a resized
  WebP copy, and serves it — and browsers keep it — for 31 days
  (`minimumCacheTTL`; a given ISBN's cover does not change). The URL asks
  for size L (~300×500) rather than M (180 wide), so a phone's single
  full-width card is sharp; the optimiser cuts it down for smaller slots
  (`sizes`). The first cover loads eagerly at high priority — on a phone it
  is the largest thing on screen. A record's own `thumbnail_url`, which can
  be on any host, still loads unoptimised. On Vercel this uses its Image
  Optimization, which counts toward the plan's quota — small for a CDI's
  collection.

**Drop** (recorded in [09-deferred.md](09-deferred.md)): the thesaurus,
section and Dewey browsers, newsletters, virtual shelves, info pages and
RSS blocks.

## 4. Edge cases

- **No records** — the new-arrivals band is not rendered at all.
- **A genre with no records** — its tile still shows; the results page
  says nothing matched. Hiding it would make tiles appear and vanish as
  the collection changes.
- **Unknown genre slug** (stale link, renamed genre) — the filter is
  ignored rather than 404ing.
- **Empty search submitted from the home** — lists the whole catalogue,
  as before. The home only shows when there is no `q` and no `genre`.

## 5. Open questions

1. **Monthly suggestions.** The CDI floated "an algorithm suggesting
   books based on different months" as an alternative to plain latest
   records. Not built — plain latest records is what was chosen; see
   [09-deferred.md](09-deferred.md).
2. **Library name** in the welcome heading. Nothing in the schema holds
   one, so "Bienvenue au CDI — École Française de Bujumbura" is a
   translated string for now.

## 6. What was built

| Where | What |
|---|---|
| `/` | The home: welcome, new arrivals, search panel, genre tiles. The app's index (CDI request) |
| `/catalogue` (no `q`, `genre` or `page`) | Redirects to `/`, so old bookmarks still land on the home |
| `/catalogue?genre=<slug>[&q=…]` | Results filtered by genre; heading becomes the genre, a removable chip shows the filter |
| `/catalogue/[id]` | A "Genre(s)" row, each linking to its filtered results |
| `/gestion/catalogue/…` | A "Genres" checkbox group on the record form |

Migration `20261118090000_genres` creates `genres` and `record_genres` and
seeds the eight genres. Data layer: `getNewArrivals`, `listGenres`,
`coverUrl` and the `genreSlug` argument of `searchCatalogue`, all in
`lib/catalogue.ts`.

Routes live in an `(opac)` route group: `app/(opac)/layout.tsx` (the public
header) wraps both `app/(opac)/page.tsx` — the home at `/` — and
`app/(opac)/catalogue/…`. The group adds nothing to the URL; it exists so
the home and the catalogue share one layout without the home sitting under
`/catalogue`. The old `app/page.tsx` redirect to `/login` is gone; staff
reach Gestion through "Se connecter". Components in `app/(opac)/_components/`: `home.tsx`,
`carousel.tsx`, `cover-image.tsx`, `genre-tile.tsx`, and `availability.tsx`
(the results list's availability line). The stand-in's logo is
`app/_components/shelf-mark.tsx`.

### Changing the tiles

Until a management screen exists ([09-deferred.md](09-deferred.md) 4.14),
tiles are edited in the `genres` table. `rank` orders them; `icon` and
`colour` are keys, not raw values, so an edit can never inject markup or an
off-palette colour — an unknown key falls back to a book icon on indigo.

| `icon` | Picture | `colour` |
|---|---|---|
| `speech` | speech bubbles | `indigo` |
| `book` | closed book | `teal` |
| `picture-book` | book with picture | `forest` |
| `wand` | magic wand | `terracotta` |
| `masks` | theatre masks | `raspberry` |
| `feather` | quill | `violet` |
| `open-book` | open book | `ochre` |
| `newspaper` | newspaper | `plum` |

Deleting a genre that records still carry is refused by the foreign key;
untick it from those records first.

### UX changes over the reference

- **Our brand, their layout.** No Marianne, no Hibouthèque name or owl —
  those belong to the French state and Canopé. The header carries the Shelf
  lockup and the École Française de Bujumbura logo side by side.
- **New arrivals stay on mobile** as a swipeable row; the reference hides
  them on small screens. Two arrow buttons float over the row's edges, so
  the first card lines up with the heading, and fade out at the end they
  cannot move towards. They are progressive enhancement — the row scrolls,
  swipes and follows keyboard focus without JavaScript. The scrollbar itself
  is hidden (CDI request).
- **The row pages itself every 30 seconds** (CDI request): forward a page,
  and back the other way once it reaches the end. It holds still while the
  pointer is over the row or keyboard focus is in it, and an arrow press,
  swipe or wheel turn restarts the countdown. Readers who ask for reduced
  motion get no autoplay. **There is no pause button** — removed at the
  CDI's request (2026-11-18); WCAG 2.2.2 asks for one on moving content,
  so the hover/focus hold and the reduced-motion opt-out are what remain
  to stop it.
  The interval is `AUTOPLAY_MS` in `carousel.tsx`.
- **The resting card is all picture** (CDI request): the cover fills the
  card edge to edge, with only author and availability beneath. The title
  appears on hover or keyboard focus, on a Shelf-teal band matching the
  type ribbon and the hover border, sliding up over the cover as the card
  zooms (8 %, 300 ms). On devices that cannot hover (phones, tablets) the
  title stays shown, or a touch reader would never learn what the book is.
  It is always in the link's text, so screen readers announce it either
  way. Readers who ask their system for reduced motion get no movement.
  The row is padded so the zoomed card is not clipped by the scroll
  container.
- **Cards carry only what a reader scans for**: the cover, a teal ribbon
  for the document type (a book icon for books, the label for anything
  else), title, author, availability. No publisher.
- **Availability is a badge beside the author, the count under the
  title** (CDI request): a small round badge at the right of the author
  line — Shelf green (`accent`) tick when a copy is on the shelf, ochre
  clock when all are on loan, grey dash when there are no copies — and
  "3 disponible(s)" on the hover band, under the title. The icon shape
  carries the state as well as the colour; green is kept for "on the
  shelf" alone. The badge is `aria-hidden`: the count is already read with
  the title. The band, ribbon and badge use `primary-foreground` on the
  teal rather than white, because white on the lighter dark-theme teal is
  only 3:1. At rest a card has only
  a soft shadow; the thick teal border appears with the hover zoom. The
  border is always 3 px wide, merely transparent at rest, so it never
  shifts the layout. Cards are wide enough that the row scrolls on desktop
  too.
- **Covers never leave a blank card.** A Shelf-branded stand-in — the
  Shelf icon over a gold rule and the title — sits under every cover, so it
  shows while a cover loads, when a record has none, and when Open Library
  has none (CDI request). A cover that fails to load, or turns out to be
  Open Library's 1×1 blank, removes itself rather than leaving a
  broken-image icon over the stand-in.
- **Keyboard and screen readers.** A "Aller au contenu" skip link is the
  first Tab stop on every OPAC page. In the carousel the arrows precede the
  cards in the DOM, so the tab order is back → forward → cards
  rather than two stray stops after the last card (WAI carousel pattern). A
  card announces its title first — "Sapiens…, Livre, 1 disponible(s),
  Yuval Noah Harari" — because the title leads the card's DOM. The heading
  carries a real space between its two lines, so it is not read as
  "…du CDI del’École".
- **The focus ring is navy in light mode**, not gold: gold on white is
  2.3:1, under the 3:1 WCAG 2.2 asks of a focus indicator. Dark keeps its
  light gold (≥ 9:1 on charcoal).
- **New arrivals query the newest ids first**, so the per-record holdings
  and author subqueries run for twelve rows rather than the whole
  catalogue.
- **The carousel re-renders only when an edge flips**, not on every scroll
  frame.
- **A two-line welcome** naming the school — "Bienvenue au CDI", then
  "ÉCOLE FRANÇAISE DE BUJUMBURA" in Shelf teal (`accent`); no subtitle
  (CDI request). The capitals come from CSS `uppercase`, so the string —
  and what screen readers say — stays in normal case.
- **Découvrir comes before the search panel**, in the DOM as well as on
  screen, so reading and tab order match what is seen (CDI request).
- **"Se connecter" in the header is set in Rajdhani** (`font-heading`),
  like the headings (CDI request).
- **The search panel carries search tips** instead of empty space, on a
  Shelf navy (`primary`) block so they read clearly (CDI request). The
  "browse the whole catalogue" link was dropped at the CDI's request; an
  empty search still lists everything.
- **Genre tiles keep colour to the icon block and border**; the label sits
  on the plain surface (CDI request). Hover lifts the tile with a shadow and
  underlines the label.
- **No dead gap above the footer**, and no horizontal overflow at 375 px.

### On phones (2026-11-18)

A pass for touch and narrow screens (CDI request). Desktop is unchanged by
all of it — each rule is scoped to touch (`pointer-coarse`, `hover:none`)
or to phone widths (`max-sm`, below `sm`).

- **The carousel arrows are gone on touch screens** — they sat on the
  covers, and swiping is the gesture there. A swipe, like an arrow press or
  a wheel turn, restarts the autoplay countdown, so the row never moves
  just after the reader has moved it. The row's scroll no longer chains
  into the page (`overscroll-x-contain`); cards are a little closer.
- **One book at a time on phones** (CDI request): below `sm` each card
  takes the row's full width (~300 px, a ~450 px cover) and snaps to the
  centre, with `scroll-snap-stop: always`, so any swipe — slow or a fast
  fling — moves exactly one book. Autoplay also advances one. Dots under
  the row (phones only, decorative) mark which book is showing; the
  carousel works out the position from the scroll offset and the first
  card's width plus the gap.
- **The title band on touch** (always shown there) is held to two lines. On
  tablets, whose cards are small, it is also set smaller, with the count
  in caption size; a phone's single full-width card keeps the full size.
- **Search**: the button goes full width under the field, so the field
  keeps its whole placeholder; the keyboard's return key reads "Search"
  (`enterKeyHint`). Its icon is now lucide's.
- **The heading** steps down to `heading-2` on phones; **genre tiles** are a
  little shorter, with a narrower icon block, and closer together.
- **The pause button** was 44 px on phones — since removed altogether.

Verified at 390 px with touch emulation (raw touch events): a 150 px
drag, a fast 270 px fling and a 400 px wheel turn each moved exactly one
card (324 px = card + gap), the dot following each time; autoplay advanced
one; desktop keeps 270 px cards and no dots.

Also verified at 375 and 390 px with touch emulation: no horizontal scroll, no
input under 16 px (no iOS zoom on focus), every tap target at least 44 px
bar the hidden-until-focused skip link; arrows `display: none` under a
coarse pointer and shown on desktop; the search button under the field on
phones, beside it on desktop; axe clean on both.

### Phone layout (2026-11-18)

- **Header in one row**: the EFB logo alone on the left (the Shelf lockup
  and its rule are hidden below `sm`), the icon-only theme switch, a
  one-button language switch and "Se connecter" on the right.
- **No welcome heading on screen** — it stays as the page's `<h1>` for
  screen readers (`sr-only`), since a page still needs its main heading.
- **A bottom bar replaces the two panels** — and, since, the header's
  sign-in: "Découvrir" (compass), a hairline, "Rechercher" (magnifier),
  then "Se connecter" (or "Mon compte") on the navy it had in the header,
  fixed to the foot of the screen. Because sign-in left the phone header,
  the bar lives in the OPAC layout and shows on every catalogue page, not
  just the home; the layout loads the genres for it (`listGenres` is
  `cache`d, so the home shares the one query). Each of the first two opens a
  sheet that rises from the bottom — a native modal `<dialog>` (focus kept
  inside, Escape closes, page behind inert, focus returns to the button),
  closed also by its × or a tap on the dimmed backdrop. The page cannot
  scroll behind it (`:root:has(dialog:modal)`). The search sheet puts the
  cursor straight in the field, which brings up the keyboard. The panels'
  content is built once on the server and placed in both spots — on the
  page for desktop, in the sheets for phones — the search field taking a
  distinct id in each (`GenreList` and `SearchPanel` are the shared
  pieces). Every catalogue page is padded at the foot so the bar never
  covers content.
- **Device defaults**: a phone's first visit uses its language and
  light/dark mode — see [02-design-system.md](02-design-system.md).

Verified with an iPhone user agent at 390 px:

- `Accept-Language: en-GB` + dark → English, dark, the dark lockup, a
  "Switch to light mode" button; choosing light applies at once and
  survives a reload. `fr-BI` → French; `rn, sw, en` → English (first of
  ours). Desktop with English + dark headers still opens light and French.
- Header 73 px, one row: no Shelf lockup, EFB logo, one "en" button, an
  icon-only theme switch; no horizontal scroll.
- `<h1>` off screen but present; panels hidden; bottom bar shown.
- Découvrir sheet: modal, 8 genres, focus inside, page scroll locked;
  Escape and a backdrop tap close it, focus back on its button. A genre
  from the sheet lands on `?genre=romans`, scroll restored.
- Search sheet: focus in `catalogue-q-sheet`; "camus" + Enter →
  `/catalogue?q=camus`, 2 results.
- Desktop unchanged: heading and panels shown, no bar. axe clean on the
  phone (sheet open) and on desktop.

### Performance check (2026-11-18)

Dev server, home page, desktop:

- One cover straight from Open Library, for reference: 8.2 s.
- Optimised and cached: each cover 17–34 ms, 7–20 KB WebP (`x-nextjs-cache:
  HIT`); a new visitor's whole page loads in 0.9–1.9 s, most of it
  server time to first byte. The first-ever request for each cover still
  pays Open Library's few seconds, once. (The dev server sends
  `max-age=0` on optimised images; production sends the 31 days.)
- Open Library's blank "no cover" comes back as a 1×1 WebP and still
  falls back to the Shelf stand-in.
- Geist Mono is no longer preloaded on every page — only record pages and
  Gestion use it — so the home fetches one font family fewer.

### Search and practical information (2026-11-18)

- **Search sits under the welcome** on desktop and tablet, the page's first
  control (CDI request); phones keep it in the bottom bar's sheet.
- **"Infos pratiques" took the search panel's place**, beside Découvrir
  (`practical-info.tsx`). It always shows what the app itself enforces —
  borrow up to `DEFAULT_LOAN_DAYS` (14) days, renew up to `MAX_RENEWALS`
  (2) times online from "Mon compte" (linked; sign-in when signed out),
  return at the desk — and, once the CDI fills in `lib/library-info.ts`,
  opening hours, where to find the CDI, email and phone. Those are empty
  for now, so hidden: the page never claims hours nobody wrote. On phones
  the panel follows the carousel (Découvrir lives in the bottom bar there).
  Built as a `<dl>`, each icon inside its term.
- **No availability key** beside "Nouveautés": one was tried and removed
  the next day (CDI decision, 2026-11-19). The badges explain themselves
  on hover and to screen readers, and their shapes (tick, clock, dash)
  carry the state without colour.
- **On phones the carousel fills the screen** between the header and the
  bottom bar (`max(28rem, 100svh − 12.25rem)`), without its panel chrome;
  the cover takes the card's height above the author line (85–92 % of the
  card at 375×667, 390×844 and 430×932), no longer a fixed 2:3.

Verified: desktop French and English — search between the heading and
the carousel, practical entries translated, Découvrir beside
Infos pratiques; phone — search and Découvrir off the page,
practical information below the carousel, the card 40 px clear of the
bar, no horizontal scroll. axe clean on both.

### Falling books, icon search, matched panels (2026-11-19)

- **Books fall behind the welcome** (`falling-books.tsx`; CDI request,
  after the sign-in page's backdrop). Small books in the genre colours
  drop from under the header, sway as they fall, and **bounce off the
  heading's letters and the search bar** — off the top with a hop towards
  the nearer end, so none settles on the text; off a side, back the other
  way. They **land on the new-arrivals panel**, lying flat or on end,
  stacking on a book that landed first, rest 3–6 s and fade out; a book
  whose support fades sinks onto what is left. The pointer pushes falling
  books aside and knocks resting ones off. At most twelve at once.
  - A small physics loop, not keyframes: where a book goes depends on what
    it hits. The page marks what counts — `data-book-bump` on the search
    bar and on each heading line (`"text"`: measured line by line, inset to
    the letters, not the line box), `data-book-floor` on the panel — and
    the loop re-reads those rectangles each frame, so reflows never strand
    a book inside the text.
  - The layer fills the catalogue layout, made `relative isolate` for it,
    so books cross the full width and pass behind the header.
  - It runs only while the heading is on screen; never on phones, where the
    carousel fills the screen; not at all with reduced motion.
- **Drifting books that quote** beside the heading on large screens (≥ lg;
  quotes from 80rem, mouse and pen), the same `QuoteBooks` as the sign-in
  page, moved to `app/_components/quote-books.tsx` so the two share it.
- **The search button is an icon** (a magnifier) joined to the field's
  right end, the field's height (CDI request), named "Rechercher" for
  screen readers and on hover. The field's own magnifier went, one being
  enough. The same form serves the results page and the phone sheet.
- **Infos pratiques is as tall as Découvrir** (the grid stretches both),
  its entries centred in the space under its heading (CDI request); the
  headings stay level across the two panels.

Verified at 1440 px, light and dark: books bounce on the heading and
spill off its ends, land and stack on the panel, fade; ~56 fps; a drifting
book quotes on hover; button 53 × 53 px beside a 53 px field; both panels
374 px. Phone: the layer is not rendered, no horizontal scroll. Reduced
motion: no falling books, drifting ones still. Sign-in page: falling books
and quotes as before. axe clean on the home (both themes) and sign-in.

### Fifteen new arrivals and a "see more" tile (2026-11-20)

- **The row holds 15 books** (was 12), then a **"Voir plus" tile** that
  opens the whole catalogue (`/catalogue?q=`; CDI request). The tile is
  the size of a book card, with a dashed Shelf-teal border, an arrow and
  "Tout le catalogue" beneath. It takes the same hover zoom as the books,
  and on phones it is one more full-screen card with its own dot.
- **It only appears when there is more to see**: the home asks for 16
  arrivals and shows 15. A catalogue of 15 titles or fewer would make the
  tile lead to the same books.
- It opens the catalogue newest first (`/catalogue?q=&tri=recent`), so the
  list carries on where the row stops. (Sorted by title until the results
  page gained its sort, 2026-11-21; see docs/10-catalogue.md §6.)
- **The phone’s search sheet shows results in place** since 2026-11-22
  (docs/10-catalogue.md §10).
- **The phone’s Découvrir sheet closes once a genre is chosen** (CDI
  request, 2026-11-21). The sheet lives in the layout, which stays mounted
  through a client-side navigation, so it used to stay open over the new
  list. It now closes on any link tap inside it; the search sheet's form
  does a full page load and was never affected.

Verified with the demo data (docs/17-demo-data.md), 106 records:
- 15 cards and the tile, all 365 px tall, in light/FR and dark/EN.
- The tile reads "Voir plus / Tout le catalogue" ("See more / Whole
  catalogue") and lands on 106 results.
- Every Découvrir genre lists titles: BD 14, romans 18, albums 12,
  fictions 17, théâtre 10, contes et poésie 10, documentaires 19,
  revues 6.
- On a phone (390 px), the tile is the same 342 × 572 card as a book, with
  16 dots and no horizontal scroll.
- axe is clean in both themes.

## 7. Verified

In Edge (headless, via Playwright) against the live database:

- `/` serves the home (200); `/catalogue` redirects to `/`; `/catalogue?q=`
  lists all 6; `?genre=romans` works; the logo and the record page's
  "Retour au catalogue" both lead to `/`.
- axe-core (WCAG 2.0–2.2 A/AA + best practice) on the home: no violations,
  light/French and dark/English.
- First Tab shows the skip link; Enter then Tab went (then) pause → forward
  ("previous" is disabled at the start) → cards. Focus ring computes to
  navy.
- Autoplay on a fake clock, restarted at a known moment: still at 29 s,
  a page forward at 30 s, back at 60 s.

- Home in French/light and English/dark at 1280 px, and at 375 px in both
  themes — no horizontal overflow, no console errors.
- Six new arrivals newest-first; Open Library covers for the five with an
  ISBN; the typeset stand-in for the one without.
- Carousel: arrows shown at every width; "previous" disabled at the start,
  "next" disabled at the end.
- Autoplay (on a fake clock, at the earlier one-minute interval — the
  logic is unchanged at 30 s): still at 59 s, a page forward at 60 s, then
  back and forth; held while hovered; held after pause, button relabelled
  "Reprendre…"; no button under reduced motion.
- Availability: badge beside the author; "1 disponible(s)" / "1 available"
  under the title on hover, shown permanently at 375 px touch. Card name
  reads "Sapiens…, 1 disponible(s), Livre, Yuval Noah Harari".
- Covers blocked: every card shows the Shelf stand-in in both themes, with
  no broken-image icon.
- Tile → `?genre=romans` → 2 results, heading "Romans", chip shown.
  Keyword within the genre (`peste`) → 1. Removing the chip keeps the
  keyword and drops the genre.
- Genre with no records (Théâtre) → empty state. Unknown slug → filter
  ignored, whole catalogue listed.
- An empty search lists everything.
- Card → record detail → genre link → filtered results.

The two records tagged *Romans* for this test were untagged afterwards; the
database was left with no genre assignments.

**Not verified in a browser: the record form's genre checkboxes.** Doing so
needs a staff sign-in, and creating a temporary test account on the shared
database was not permitted. The code path is typechecked and builds; it
should be exercised by hand — tick two genres, save, reload, confirm both
stay ticked and the record appears under both tiles.

**Found while testing:** the sample record *Devenir* carries ISBN
9782081471757, which is Houellebecq's *Sérotonine* — its cover gives it
away. A seed-data error, not a code one; see
[09-deferred.md](09-deferred.md) 6.4.
