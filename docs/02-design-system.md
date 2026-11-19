# Design system

## File organization

- [app/globals.css](../app/globals.css) — imports Tailwind, imports every
  file below, wires the `next/font` variables, sets base `body` styles.
- `app/styles/typography.css` — semantic type scale.
- `app/styles/spacing.css` — semantic layout-rhythm tokens.
- `app/styles/colors.css` — semantic color slots (Shelf Library brand).
- `app/styles/radius.css` — semantic border-radius aliases.
- `app/styles/shadows.css` — semantic elevation aliases.
- `app/styles/layout.css` — reusable layout utilities (`stack`, `cluster`,
  `center`, `container-page`).

No `tailwind.config.js` — Tailwind v4 is CSS-first; every token above is
declared with `@theme` (or `@theme inline` for values that reference a
runtime CSS variable, like the `next/font` variables) and Tailwind
generates the matching utility classes automatically.

## Typography

Defined in `app/styles/typography.css`. Semantic roles, not raw sizes —
each one bundles size, line-height, letter-spacing, and a default weight:

`text-display`, `text-heading-1`, `text-heading-2`, `text-heading-3`,
`text-body` (default body copy), `text-body-sm`, `text-caption`.

Faces: **Rajdhani** for headings — pair a heading role with `font-heading`
— and **Inter** for body, which is the default `font-sans` (Brand guideline
§04). The guideline names Playfair Display for headings; the CDI chose
Rajdhani instead (2026-11-18), and the utility was renamed from
`font-serif` to `font-heading` so the name stops describing a face it no
longer is. Rajdhani is condensed with a small x-height, so the heading
roles are a step larger and carry no negative tracking. Playfair is no
longer loaded at all, since the logo became the monogram (see Logo). All
load via `next/font/google` in [app/layout.tsx](../app/layout.tsx); Geist
Mono is not preloaded, being used only on record pages and in Gestion.

**The interface is scaled 103.5 % from 48rem (768 px) up** — `html {
font-size: 103.5% }` in `app/globals.css` (CDI request for legibility).
First tried at 130 %, which crowded laptop screens, then 115 %
(2026-11-18) — which had only looked right in development because the
browser was zoomed to 90 % on localhost. 103.5 % is that same rendering
(115 × 0.9) without the browser zoom (2026-11-19).
Everything rem-based grows together; breakpoints do not move, because
media queries measure rem against the browser default. Phones stay at
100 %, the size their layout is built for. Borders, shadows and other px
values do not scale.

Reach for the roles before a raw `text-2xl`/`text-lg`. Tabular/identifier
data — call numbers, barcodes, ISBNs — should use `font-mono` (Geist Mono,
kept because the brand kit does not cover a monospace face), since numbers
and codes need to line up when scanned in a column.

## Spacing

Defined in `app/styles/spacing.css`. Tailwind's numeric scale (`p-4`,
`gap-2`, ...) already covers component-level spacing; these named tokens
are for the small number of recurring *structural* gaps: `spacing-inline`
(icon+label), `spacing-content` (related blocks), `spacing-section`
(major page sections), `spacing-page-x` / `spacing-page-y` (page gutters).
Used via the normal utilities: `gap-content`, `px-page-x`, etc.

## Color tokens (Shelf Library brand)

Defined in `app/styles/colors.css`, built from the six swatches in
`assets/shelf-library-brand/brand-guidelines/Brand guideline.png` §03:
Deep Navy `#0F1B2E`, Gold `#C8A56A`, Teal Green `#2E7D71`, Warm Ivory
`#EDE7DC`, Slate Gray `#6B7280`, Charcoal `#111827`.

**Light runs on white, not Warm Ivory** — the CDI asked for a whiter,
easier-to-read page (2026-11-18). Ivory survives as `surface-muted` (the
new-arrivals band, tips, table heads), and the two secondary text colours
were darkened to 7.6:1 and 4.8:1 on white.

The guideline gives six brand colors, not a full UI system, so hovers,
borders, subtle text and the danger/info roles are **derived** from them.
Every derived value is marked `/* derived */` in the file; anything
unmarked is a guideline value used verbatim.

Semantic slots: `background`, `foreground`, `surface`, `surface-muted`,
`foreground-muted`, `foreground-subtle`, `primary` (+`-hover`,
`-foreground`), `secondary` (+`-hover`), `accent`, `border`,
`border-strong`, `ring`, and `success`/`warning`/`danger`/`info`. Light and
dark are both defined, switched by `prefers-color-scheme`.

Note `primary` **inverts**: deep navy on light, pale blue on dark. Always
pair it with `primary-foreground` rather than assuming white text.

Components reference semantic names only (`bg-surface`), never a raw brand
value (`bg-navy-900`), so a palette change stays confined to that one file.

The kit's `colors/css-variables.css` gives slightly different hexes than
the guideline (navy `#10233C` vs `#0F1B2E`) and is **not** used — the
guideline is authoritative, by decision. Still worth reconciling at source
so the kit does not contradict itself.

## Motion

Two keyframe tokens, in `app/globals.css`, both for the decorative books
behind the sign-in page: **`animate-drift`**, a slow float-and-tilt loop
(14 s by default), and **`animate-fall`**, top to bottom of the nearest
size container in `cqh` units, so it spans the backdrop however tall the
page is (20 s; its container needs `container-type: size`). An element sets its resting angle in
`--tilt` and its own `animation-duration`/`-delay`, so several never move
in step; it animates the individual `translate`/`rotate` properties and
leaves `transform` alone. Anything that moves pairs it with
`motion-reduce:animate-none` (or `motion-reduce:transition-none`).

## Border radius

Defined in `app/styles/radius.css`. `radius-control` (buttons/inputs),
`radius-card` (cards/panels), `radius-panel` (large surfaces/dialogs) —
aliases onto Tailwind's default radius scale, picked by role instead of
by remembering which step a component used last time.

## Shadows

Defined in `app/styles/shadows.css`. `shadow-card` (resting cards/list
rows), `shadow-popover` (dropdowns/tooltips), `shadow-modal`
(dialogs) — aliases onto Tailwind's default shadow scale, same reasoning
as border radius.

## Layout utilities

Defined in `app/styles/layout.css` via Tailwind's `@utility` directive
(so they get variant support — `md:stack`, etc. — for free):

- `container-page` — page-width wrapper with horizontal gutters.
- `stack` — vertical flex container (combine with a `gap-*` utility).
- `cluster` — horizontal, wrapping flex container, items centered.
- `center` — grid, single child centered both axes.

These are generic primitives, not page layouts. The authentication screens
use them.

## Principles

- **One design system, not a skin engine.** Legacy PMB ships ~15
  switchable CSS themes (`../CDI_PROJECT/styles/`). Deliberately not
  porting that — one coherent look, defined once across the files above.
- **Tokens over hardcoded values.** New colors/spacing/radii/shadows go in
  the matching `app/styles/*.css` file as a `@theme` entry, referenced via
  the generated Tailwind utility — never a literal hex/px value in a
  component.
- **Utility-first.** Use Tailwind classes directly in JSX. Reach for a
  shared component only once a pattern repeats across two or more routes
  (same rule as folder structure in [CLAUDE.md](../CLAUDE.md)).
- **No component library installed.** Build primitives (button, input,
  card) as plain Tailwind-styled components as they're actually needed.

## Accessibility

The OPAC is public-facing (students, staff, and potentially the wider
public). Baseline bar for every screen:

- Visible focus states on all interactive elements (Tailwind's default
  focus rings are enough — don't strip them with `outline-none` without
  replacing them).
- Sufficient contrast against both light and dark `background` values.
  That includes the focus ring: `ring` is Deep Navy in light (gold on white
  is only 2.3:1, under the 3:1 a focus indicator needs) and light gold in
  dark.
- A skip link ("Aller au contenu") as the first Tab stop wherever a header
  sits before the content — the OPAC layout has one.
- Semantic HTML first (`<nav>`, `<main>`, `<button>`, real form labels)
  before reaching for ARIA attributes.

## Icons

**`lucide-react`**, adopted with the OPAC home (genre tiles, carousel
arrows, availability badge, filter chip, phone bottom bar). Import named icons only, so the
bundle carries just those; mark decorative ones `aria-hidden="true"`. New
icons come from this set. Older screens still hand-roll their SVGs —
convert them when next touched ([09-deferred.md](09-deferred.md) 7.1).

### Genre tile colours

Eight derived hues in `app/styles/colors.css` (`bg-genre-indigo`,
`border-genre-teal`, …), one per tile. They are named by hue rather than by
genre because which genre wears which colour is data (`genres.colour`).
Saturated and warm (CDI request, 2026-11-18 — a first muted set read as
washed out; the cool `slate` was replaced by `terracotta`, with a migration
moving the row). Each carries a white icon at ≥ 4.5:1 (lowest: teal,
4.86:1), and unlike the semantic slots they do not switch with the theme.
Colour is confined to a tile's icon block and border; the label stays on
the plain surface.

## Theme and language

Both are user preferences held in cookies and read on the server
(`lib/preferences.ts`), so the first paint is already correct — no flash of
the wrong theme and no client-side i18n runtime.

- **Theme** switches on `<html data-theme>`. On **desktop** the app opens in
  **light** regardless of the OS setting, and the user toggles explicitly.
  On a **phone** with no choice made yet (CDI request, 2026-11-18) the
  server leaves `data-theme` off and the device's light/dark mode applies
  through `prefers-color-scheme` — the server cannot know it, so CSS
  decides. The dark palette is one `@utility theme-dark`, applied both
  for `[data-theme="dark"]` and for a dark device with no `data-theme`, so
  it is never written twice. Anything theme-dependent rendered on the
  server must then cover both: the Shelf lockup (`ThemedLogo` sends both
  variants and a media query shows one) and the theme switch (both
  buttons, the one switching away from what is on screen shown).
- **"Phone"** is the `Sec-CH-UA-Mobile` client hint, else a mobile user
  agent; tablets mostly report as desktops and keep desktop defaults.
- **Language** is `fr` (default) or `en`, with strings in `lib/i18n.ts` — a
  plain typed dictionary rather than an i18n library, since two locales and
  one feature do not justify a dependency. Every value must stay a plain
  string: the dictionary is passed to Client Components, and functions
  cannot cross that boundary (placeholders use `{braces}` + `fill()`).
  A phone with no choice made yet starts from its `Accept-Language`: the
  first of our two locales it lists, by `q` order, else French.

Both switches are plain forms posting to Server Actions, so they work
without JavaScript, and a choice made with them (a cookie) always wins over
a device default. The theme switch's short label is translated ("Sombre" /
"Clair"); a globe marks the language switch. They live in `app/_components/preferences-bar.tsx`. On
phones they compact for a one-row header: the theme switch is icon-only
and the language control shows only the other language, as a one-tap
switch.

## Logo

**The Shelf monogram** — the icon-only mark, `01-logo/icon/Icon only.svg`
— inlined as `app/_components/shelf-mark.tsx` (CDI decision,
2026-11-18). The horizontal lockup it replaced drew "Shelf" / "LIBRARY" as
live `<text>` in Playfair Display and Inter, which kept an extra font
family loading on every page and needed a light and a dark variant (both
sent while a phone followed its device theme). The monogram is shapes
only, and its fills are theme tokens, so one copy follows light and dark:
`ink` (default `fill-primary`) for the navy books and shelf, `gap` for
the bands across the spines — the colour of whatever the mark sits on
(`fill-surface` in headers, `fill-surface-muted` on cover stand-ins).
Gestion's sidebar is navy in both themes and passes ivory ink and navy
gaps. With a `label` it is the logo (`role="img"`, "Shelf Library");
without, decoration.

The school's mark sits beside it, after a thin rule (catalogue header,
sign-in page, Gestion sidebar) — and alone on phones, where the monogram
steps aside, 20 % larger there (3.6 rem in the catalogue and sign-in
headers, 4.2 rem in the Gestion sidebar; CDI request):
`app/_components/efb-logo.tsx`. The source is
`assets/shelf-library-brand/01-logo/EFB/Logo EFB.png`, copied to
`public/efb-logo.png` and statically imported so `next/image` serves a
resized copy — the original is ~900 KB.

The same monogram, unlabelled, is the placeholder on cover-less
new-arrival cards.
