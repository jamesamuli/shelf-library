# Migration workflow

## Principle

This is a rewrite, not a port. Legacy PMB (`../CDI_PROJECT`) is read for
*behavior* — what a screen does, what data it touches, what edge cases
matter — never copied as code. Legacy patterns that exist because of PHP's
age (file-per-page routing, global state, inline SQL, hand-rolled EAV
custom fields) are not patterns to preserve.

## One module at a time

**Never work on two unrelated modules at once.** A module is finished —
through step 6 below — before the next one starts. Partial work across
several modules is what makes a migration impossible to review or hand
over.

## Per-module process

Six steps, in order:

1. **Inspect the PHP implementation.** Find the entry point(s) — a root
   `.php` file for OPAC behavior, an `admin/<module>` folder for back
   office — and the classes and tables it uses.
   [01-architecture.md](01-architecture.md) and
   [03-database.md](03-database.md) map legacy folders and tables to
   domains to speed this up.
2. **Explain the business logic.** In writing, before any code: what the
   module actually does, the rules it enforces, and the edge cases (zero
   results, staff-only vs public views, EAV custom fields vs fixed
   columns). Surface anything that looks like a deliberate rule rather
   than an accident — those are the parts worth keeping.
3. **Build the Next.js version.** Current Next.js/React idioms per
   [01-architecture.md](01-architecture.md), styling per
   [02-design-system.md](02-design-system.md), data model scoped per
   [03-database.md](03-database.md)'s "target approach". A rewrite, not a
   transcription.
4. **Improve the UX.** Do not reproduce the legacy screen. Legacy PMB's
   interfaces are dense and 2000s-era; the point of rewriting is to do
   better. Visual reference: `assets/shelf-library-brand/ui-assets/`
   — `GESTION.png` for back-office layouts (sidebar, stat cards, data
   tables, quick actions) and `OPUS.png` for the public catalogue (search
   bar, facets, result cards, quick access). Match their structure and
   density, not their exact content.
5. **Test.** Verify in a real browser: the golden path plus the edge cases
   named in step 2. Check both themes, both locales, and mobile width.
6. **Update the documentation.** Write or update `docs/<module>.md` per
   the definition of done below, and add anything deliberately skipped to
   [09-deferred.md](09-deferred.md).

## Prioritization

Start with **read-heavy, low-risk, stateless** features before **write-
heavy, stateful** ones. Concretely: public catalog browsing/search before
circulation, circulation before acquisitions/serials. This also forces the
data-layer decision (see [01-architecture.md](01-architecture.md)'s open
decisions) on a low-stakes feature first. Full ordering in
[05-roadmap.md](05-roadmap.md).

## Definition of done for a migrated module

- All six steps above are complete — a module is not done at step 3.
- Works in a real browser for the golden path and known edge cases, in
  light and dark, in French and English, at mobile width.
- Has a `docs/<module>.md` entry describing what was kept, what was
  deliberately dropped or changed, and any open questions.
- Anything skipped is recorded in [09-deferred.md](09-deferred.md).
- No legacy PHP copied verbatim; no speculative scope beyond what the
  legacy module (or an explicit new requirement) actually needs.
- No new dependency added unless this module concretely needs it.

## Explicitly deferred

Not scheduled unless a task names them:

- Multi-language i18n (legacy ships fr/en/es/it/pt/la UI translations).
- The legacy skin/theme system.
- Protocol connectors: Z39.50, SIP2 (self-check hardware), OAI-PMH/harvest.
- Digital lending (`pnb_*` — third-party e-book lending integration).

## When a legacy feature has no clear modern equivalent

Some legacy modules exist for reasons specific to 2000s-era library
systems or integrations this CDI may no longer use. Don't assume it should
be rebuilt as-is: write what it does in the feature's `docs/` entry and
ask before implementing, rather than guessing intent.
