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

Faces (Brand guideline §04): **Playfair Display** for headings — pair a
heading role with `font-serif` — and **Inter** for body, which is the
default `font-sans`. Both load via `next/font/google` in
[app/layout.tsx](../app/layout.tsx).

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
- Semantic HTML first (`<nav>`, `<main>`, `<button>`, real form labels)
  before reaching for ARIA attributes.

## Icons

Still no icon dependency. The authentication screens hand-roll the four
SVGs they need (user, lock, eye, plus the logo mark). If a third screen
needs icons, switch to a single small set rather than spreading more
hand-written SVGs across components.

## Theme and language

Both are user preferences held in cookies and read on the server
(`lib/preferences.ts`), so the first paint is already correct — no flash of
the wrong theme and no client-side i18n runtime.

- **Theme** switches on `<html data-theme>`, *not* `prefers-color-scheme`.
  The app opens in **light** regardless of the OS setting, and the user
  toggles explicitly.
- **Language** is `fr` (default) or `en`, with strings in `lib/i18n.ts` — a
  plain typed dictionary rather than an i18n library, since two locales and
  one feature do not justify a dependency. Every value must stay a plain
  string: the dictionary is passed to Client Components, and functions
  cannot cross that boundary (placeholders use `{braces}` + `fill()`).

Both switches are plain forms posting to Server Actions, so they work
without JavaScript. They live in `app/(auth)/_components/preferences-bar.tsx`.

## Logo

The horizontal lockup, one variant per theme: `Horizontal logo
whitemode.svg` for light, `Horizontal logo darkmode.svg` for dark.

Its wordmark is `<text>` in Playfair Display and Inter, so it **must be
inlined in the document** — an `<img>` or `background-image` is an isolated
document and cannot use the page's fonts. `app/(auth)/_components/
horizontal-logo.tsx` embeds the markup with `font-family` rewritten to the
`next/font` CSS variables, and prefixes the generic `.cls-N` class names per
variant so the two cannot collide. It is generated from the source files —
regenerate rather than hand-editing.
