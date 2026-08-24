# docs

Migration notes for porting features from legacy PMB (`../../CDI_PROJECT`,
read-only) into this Next.js app.

Start here: [00-project.md](00-project.md), [01-architecture.md](01-architecture.md),
[02-design-system.md](02-design-system.md), [03-database.md](03-database.md),
[04-migration.md](04-migration.md), [05-roadmap.md](05-roadmap.md).

Data model: [06-legacy-data-model.md](06-legacy-data-model.md) (inspection of
the legacy 514-table schema) and [07-target-schema.md](07-target-schema.md)
(proposed PostgreSQL design, implemented as `prisma/schema.prisma`).

Features: [08-authentication.md](08-authentication.md) — the two sign-in
portals (Gestion / OPAC). [10-catalogue.md](10-catalogue.md) — the public
catalogue (search + record detail). [11-circulation.md](11-circulation.md) —
check-out, check-in, renewal, and the patron's own loans.
[12-cataloguing.md](12-cataloguing.md) — the back office: records and copies.
[13-readers.md](13-readers.md) — enrolling readers and the CSV class import.
[14-reservations.md](14-reservations.md) — holds, and the reshelving worklist.

**[09-deferred.md](09-deferred.md) — everything knowingly left undone.**
Check it before starting a phase, and add to it whenever something is
deferred.

As features are picked up (per the roadmap), add one file per feature, e.g.
`circulation.md`, `auth-notes.md`. Each should capture what the legacy
screen/module does today, what's worth keeping vs. dropping, and any open
questions — not a copy of the PHP source.
