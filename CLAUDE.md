@AGENTS.md

# pmb-next — Development Principles

## What this project is

`pmb-next` is a from-scratch Next.js rewrite of **PMB** (PhpMyBibliothèque), a
legacy PHP library-management system. The legacy app lives read-only at
`../CDI_PROJECT` (sibling folder) and is our **reference only** — we consult
it to understand existing behavior, data model, and screens. We never edit it
and we never copy its code wholesale; we re-implement.

Current stage: **project scaffolding only**. No PMB feature has been ported
yet. Do not start migrating a feature unless explicitly asked to.

## Tech stack

- Next.js (App Router) — see `node_modules/next/dist/docs/` for this
  version's actual APIs before writing code that touches routing, data
  fetching, or server/client boundaries. Do not assume training-data Next.js
  behavior; this version has breaking changes.
- React 19, TypeScript, Tailwind CSS v4.
- No database, ORM, auth library, or state-management library is installed
  yet. Don't add one speculatively — add it in the task that first needs it,
  and prefer the simplest option that solves that task.

## Folder structure

```
pmb-next/
├── app/          # Next.js App Router routes, layouts, pages
├── public/       # Static files served as-is
├── docs/         # Migration notes: feature specs, data-model notes, decisions
├── assets/       # Non-code reference material (legacy screenshots, exports, design refs)
└── CLAUDE.md     # This file
```

As real features land, group code by feature under `app/`, and only introduce
shared folders (`components/`, `lib/`, `types/`) at the point something is
actually shared by two or more features. Don't pre-create empty structural
folders for hypothetical future code.

### docs/

One file per feature or decision, e.g. `docs/circulation.md`,
`docs/auth-notes.md`. Capture: what the legacy screen/module does, the parts
worth keeping vs. dropping, and open questions — not a copy of the PHP code.

### assets/

Reference material that isn't code: screenshots of legacy PMB screens, sample
data exports, icons/logos pulled from the legacy app for parity checks.
Nothing here is built or bundled.

## Migration workflow

**One module at a time. Never work on two unrelated modules at once** — a
module is finished through step 6 before the next one starts.

1. **Inspect** the PHP implementation under `../CDI_PROJECT` — don't guess.
2. **Explain the business logic** in writing, before any code: what it
   does, the rules it enforces, the edge cases.
3. **Build** the Next.js version using current idioms. A rewrite, not a
   transcription; legacy PHP structure (file-per-page, global state,
   inline SQL) is not a pattern to preserve.
4. **Improve the UX** — don't reproduce the legacy screen. Visual
   reference: `assets/shelf-library-brand/ui-assets/` (`GESTION.png` for
   back office, `OPUS.png` for the public catalogue).
5. **Test** in a real browser: golden path plus edge cases, both themes,
   both locales, mobile width.
6. **Update the docs** — `docs/<module>.md`, plus `docs/09-deferred.md`
   for anything deliberately skipped.

Full detail in `docs/04-migration.md`.

## Code principles

- No speculative abstractions. Build what the current task needs; three
  similar lines beat a premature helper.
- No dead code, no commented-out blocks, no TODO stubs for unstarted work.
- Comments explain *why*, not *what* — skip comments that just restate the
  code.
- Keep dependencies minimal. Every addition to `package.json` should trace
  back to a concrete, current need.
- Validate at system boundaries (form input, external data) — don't add
  defensive checks for states that can't occur internally.
- Prefer editing existing files over creating new ones.

## Before writing code

Always check `node_modules/next/dist/docs/` for the guide relevant to what
you're about to touch (routing, data fetching, caching, server actions,
etc.) — this project's Next.js version diverges from familiar conventions,
and stale assumptions cause real bugs here.
