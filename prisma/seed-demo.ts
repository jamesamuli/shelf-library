import { randomBytes } from "node:crypto";
import type { Prisma } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";
import { hashPassword } from "../app/(auth)/_lib/password";
import biographies from "./demo-authors.json";
import publisherNotes from "./demo-publishers.json";
import catalogue from "./demo-catalogue.json";
import englishAbstracts from "./demo-abstracts-en.json";

/**
 * Demonstration data: a hundred records across every genre, their copies, a
 * school population, and some circulation, so every OPAC and Gestion screen
 * has something to show. Run after `prisma db seed`, which creates the
 * reference rows this builds on:
 *
 *   npm run seed:demo
 *
 * Idempotent: records are matched by title, readers by card number, and the
 * circulation is only drawn once.
 *
 * It also creates one account of each kind, with the access legacy PMB gave
 * it: an administrator in Gestion (a staff user with every right), and a
 * teacher and a pupil in the OPAC (readers, told apart by their category's
 * loan rules, legacy's empr_categ). Readers sign in with Google only, so
 * their school addresses come from SEED_TEACHER_EMAIL / SEED_STUDENT_EMAIL —
 * never written here, the repository being public.
 */

type DemoRecord = {
  title: string;
  subtitle?: string;
  authors: { name: string; forename?: string; dates?: string }[];
  publisher: string;
  city?: string;
  year: number;
  genre: string;
  type: string;
  series?: string;
  volume?: string;
  dewey?: string;
  subjects: string[];
  copies: number;
  reference?: boolean;
  isbn?: string;
  /** The edition's page count, from Open Library: the collation. */
  pages?: string;
  abstract: string;
};

const RECORDS = catalogue as DemoRecord[];

/** Shelf labels for the Dewey classes the demo uses. */
const DEWEY: Record<string, string> = {
  "028": "Lecture",
  "050": "Périodiques généralistes",
  "303.4": "Évolution sociale",
  "305.8": "Groupes ethniques et racisme",
  "320": "Science politique",
  "325.3": "Colonisation",
  "338.96": "Économie du développement : Afrique",
  "363.7": "Environnement",
  "398.2": "Contes et légendes",
  "505": "Sciences : périodiques",
  "520": "Astronomie",
  "523.1": "Univers, cosmologie",
  "576.5": "Génétique",
  "576.8": "Évolution",
  "616.8": "Neurologie",
  "701.85": "Couleur dans les arts",
  "822": "Théâtre anglais",
  "841": "Poésie française",
  "842": "Théâtre français",
  "910": "Géographie, voyages",
  "910.5": "Géographie : périodiques",
  "940.53": "Seconde Guerre mondiale",
  "968.06": "Afrique du Sud, histoire",
};

/** Where each genre is shelved; theatre, poetry and tales sit with the Dewey shelves. */
const SECTION_OF: Record<string, string> = {
  romans: "Romans et fictions",
  fictions: "Romans et fictions",
  "bandes-dessinees": "Bandes dessinées",
  albums: "Albums",
  revues: "Périodiques",
  theatre: "Documentaires",
  "contes-poesie": "Documentaires",
  documentaires: "Documentaires",
};

const SHELF_PREFIX: Record<string, string> = {
  romans: "R",
  fictions: "R",
  "bandes-dessinees": "BD",
  albums: "A",
  "contes-poesie": "C",
  revues: "PER",
};

/** The records the base seed created without a genre (or a language). */
const EXISTING_GENRES: Record<string, string> = {
  "L’Étranger": "romans",
  "La Peste": "romans",
  "1984": "fictions",
  "Sapiens : une brève histoire de l’humanité": "documentaires",
  "Devenir": "documentaires",
  "La Poétique de l’espace": "documentaires",
};

const BORROWED = [
  "Petit Pays",
  "Hunger Games",
  "Antigone",
  "Le Malade imaginaire",
  "Le Journal d’Anne Frank",
  "Harry Potter à l’école des sorciers",
  "L’Arabe du futur",
];

const CLASSES = ["6ème B", "5ème A", "4ème C", "3ème A", "2nde A", "1ère B", "Terminale A"];

// [lastName, firstName, gender, class]
const PUPILS: [string, string, "F" | "M", string][] = [
  ["Niyonzima", "Grâce", "F", "6ème B"],
  ["Ndayishimiye", "Eric", "M", "6ème B"],
  ["Martin", "Léa", "F", "6ème B"],
  ["Hakizimana", "Joël", "M", "6ème B"],
  ["Kaneza", "Ornella", "F", "5ème A"],
  ["Bernard", "Hugo", "M", "5ème A"],
  ["Nshimirimana", "Divine", "F", "5ème A"],
  ["Bizimana", "Yves", "M", "5ème A"],
  ["Iteka", "Sandrine", "F", "4ème C"],
  ["Dubois", "Lucas", "M", "4ème C"],
  ["Ndikumana", "Arnaud", "M", "4ème C"],
  ["Uwimana", "Belyse", "F", "4ème C"],
  ["Niyonkuru", "Christian", "M", "3ème A"],
  ["Lefebvre", "Chloé", "F", "3ème A"],
  ["Habonimana", "Fabrice", "M", "3ème A"],
  ["Irakoze", "Nadia", "F", "3ème A"],
  ["Ntakirutimana", "Olivier", "M", "2nde A"],
  ["Moreau", "Inès", "F", "2nde A"],
  ["Ininahazwe", "Aline", "F", "2nde A"],
  ["Nduwimana", "Steve", "M", "2nde A"],
  ["Girukwishaka", "Patricia", "F", "1ère B"],
  ["Petit", "Thomas", "M", "1ère B"],
  ["Manirakiza", "Kevin", "M", "1ère B"],
  ["Akimana", "Josiane", "F", "1ère B"],
  ["Nimbona", "Cédric", "M", "Terminale A"],
  ["Laurent", "Emma", "F", "Terminale A"],
  ["Ciza", "Bertrand", "M", "Terminale A"],
  ["Ishimwe", "Clarisse", "F", "Terminale A"],
];

// [lastName, firstName, gender, note]
const TEACHERS: [string, string, "F" | "M", string][] = [
  ["Ntahombaye", "Désiré", "M", "Professeur de lettres"],
  ["Rousseau", "Isabelle", "F", "Professeure d’histoire-géographie"],
  ["Barutwanayo", "Félix", "M", "Professeur de SVT"],
  ["Girard", "Nathalie", "F", "Professeure documentaliste suppléante"],
  ["Nkeshimana", "Pascaline", "F", "Professeure des écoles"],
];

/** Small deterministic PRNG, so a re-run draws the same circulation. */
function random(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 2 ** 32;
    return state / 2 ** 32;
  };
}
const rand = random(20261120);
const pick = <T,>(list: T[]) => list[Math.floor(rand() * list.length)];

function shuffled<T>(list: T[]): T[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function daysFromToday(days: number): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + days));
}

const authorCode = (text: string) =>
  text.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase();

function resolvePassword(envVar: string) {
  const fromEnv = process.env[envVar];
  return fromEnv
    ? { value: fromEnv, generated: false }
    : { value: randomBytes(9).toString("base64url"), generated: true };
}

/** Find-or-create by a natural key, remembered for the rest of the run. */
function lookup<T>(create: (key: string) => Promise<T>) {
  const cache = new Map<string, Promise<T>>();
  return (key: string) => {
    if (!cache.has(key)) cache.set(key, create(key));
    return cache.get(key)!;
  };
}

async function main() {
  const [catalogued, location, shelfStatus, referenceStatus] = await Promise.all([
    prisma.recordStatus.findUniqueOrThrow({ where: { id: 1 } }),
    prisma.location.findUniqueOrThrow({ where: { id: 1 } }),
    prisma.itemStatus.findUniqueOrThrow({ where: { id: 1 } }),
    prisma.itemStatus.findUniqueOrThrow({ where: { id: 2 } }),
  ]);

  const documentType = lookup(async (label) =>
    (await prisma.documentType.findFirst({ where: { label } })) ??
    prisma.documentType.create({ data: { label } }),
  );
  const section = lookup(async (label) =>
    (await prisma.section.findFirst({ where: { label } })) ??
    prisma.section.create({ data: { label } }),
  );
  const genre = lookup((slug) => prisma.genre.findUniqueOrThrow({ where: { slug } }));
  const series = lookup(async (name) =>
    (await prisma.series.findFirst({ where: { name } })) ?? prisma.series.create({ data: { name } }),
  );
  const classification = lookup((code) =>
    prisma.classificationIndex.upsert({
      where: { code },
      update: {},
      create: { code, comment: DEWEY[code] ?? null },
    }),
  );
  const subject = lookup(async (label) => {
    const existing = await prisma.subjectLabel.findFirst({ where: { label, languageCode: "fr" } });
    if (existing) return existing.subjectId;
    const created = await prisma.subject.create({
      data: { labels: { create: { languageCode: "fr", label } } },
    });
    return created.id;
  });
  const publisher = lookup(async (key) => {
    const [name, city] = key.split("|");
    return (
      (await prisma.publisher.findFirst({ where: { name } })) ??
      prisma.publisher.create({ data: { name, city: city || null } })
    );
  });
  const author = lookup(async (key) => {
    const { name, forename, dates } = JSON.parse(key) as DemoRecord["authors"][number];
    return (
      (await prisma.author.findFirst({ where: { name, forename: forename ?? null } })) ??
      prisma.author.create({ data: { name, forename: forename ?? null, dates: dates ?? null } })
    );
  });

  // Copies are numbered from CDI-100001 so they never meet the base seed's.
  const lastDemoItem = await prisma.item.findFirst({
    where: { barcode: { startsWith: "CDI-1" } },
    orderBy: { barcode: "desc" },
  });
  let barcode = lastDemoItem ? Number(lastDemoItem.barcode.slice(4)) : 100000;

  // Spread over the last four months in a shuffled order, so the new-arrivals
  // row mixes genres instead of showing the file's last block. The titles the
  // demo accounts borrow go last, i.e. oldest, so their loans can date back
  // weeks without predating the copy.
  const order = shuffled(RECORDS.map((_, index) => index)).sort(
    (a, b) => Number(BORROWED.includes(RECORDS[a].title)) - Number(BORROWED.includes(RECORDS[b].title)),
  );
  let created = 0;
  for (const [rank, index] of order.entries()) {
    const entry = RECORDS[index];
    if (await prisma.bibliographicRecord.findFirst({ where: { title: entry.title } })) continue;

    const addedAt = daysFromToday(-Math.round(rank * 1.2) - 1);
    addedAt.setUTCHours(8 + (rank % 9), (rank * 7) % 60);
    const shelfMark = entry.dewey ?? SHELF_PREFIX[entry.genre];
    const callNumber = `${shelfMark} ${authorCode(entry.authors[0]?.name ?? entry.title)}`;
    const shelf = await section(SECTION_OF[entry.genre]);

    const authorIds = [];
    for (const person of entry.authors) authorIds.push((await author(JSON.stringify(person))).id);
    const subjectIds = [];
    for (const label of entry.subjects) subjectIds.push(await subject(label));

    await prisma.bibliographicRecord.create({
      data: {
        title: entry.title,
        subtitle: entry.subtitle ?? null,
        bibliographicLevel: entry.type === "Revue" ? "SERIAL" : "MONOGRAPH",
        standardNumber: entry.isbn ?? null,
        pageCount: entry.pages ?? null,
        publicationYear: entry.year,
        abstract: entry.abstract,
        documentTypeId: (await documentType(entry.type)).id,
        statusId: catalogued.id,
        classificationIndexId: entry.dewey ? (await classification(entry.dewey)).id : null,
        seriesId: entry.series ? (await series(entry.series)).id : null,
        volumeNumber: entry.volume ?? null,
        createdAt: addedAt,
        contributions: {
          create: authorIds.map((authorId, rank) => ({ authorId, relatorCode: "070", level: "PRIMARY", rank })),
        },
        recordPublishers: {
          create: { publisherId: (await publisher(`${entry.publisher}|${entry.city ?? ""}`)).id },
        },
        recordSubjects: { create: subjectIds.map((subjectId, rank) => ({ subjectId, rank })) },
        recordGenres: { create: { genreId: (await genre(entry.genre)).id } },
        languages: { create: { languageCode: "fre" } },
        items: {
          create: Array.from({ length: entry.copies }, (_, copy) => ({
            barcode: `CDI-${++barcode}`,
            callNumber,
            locationId: location.id,
            sectionId: shelf.id,
            // A magazine's first copy stays in the reading room.
            statusId: entry.reference && copy === 0 ? referenceStatus.id : shelfStatus.id,
            acquiredOn: addedAt,
          })),
        },
      },
    });
    created++;
  }

  for (const [title, slug] of Object.entries(EXISTING_GENRES)) {
    const record = await prisma.bibliographicRecord.findFirst({ where: { title } });
    if (!record) continue;
    const { id: genreId } = await genre(slug);
    await prisma.recordGenre.upsert({
      where: { recordId_genreId: { recordId: record.id, genreId } },
      update: {},
      create: { recordId: record.id, genreId },
    });
    // All six are French editions; without it the language filter skips them.
    await prisma.recordLanguage.upsert({
      where: { recordId_languageCode: { recordId: record.id, languageCode: "fre" } },
      update: {},
      create: { recordId: record.id, languageCode: "fre" },
    });
  }

  // The author pages' biographies (legacy `author_comment`), keyed
  // "name|forename". Only an empty one is filled: a biography the CDI has
  // since written is never overwritten.
  for (const [key, biography] of Object.entries(biographies as Record<string, string>)) {
    const [name, forename] = key.split("|");
    await prisma.author.updateMany({
      where: { name, forename: forename ?? null, comment: null },
      data: { comment: biography },
    });
  }

  // The publisher dialog's descriptions, likewise only where none is written.
  for (const [name, description] of Object.entries(publisherNotes as Record<string, string>)) {
    await prisma.publisher.updateMany({ where: { name, comment: null }, data: { comment: description } });
  }

  // The English abstracts, keyed by title, for the demo records and the
  // base ones that have an abstract. Translated once by hand rather than by the cataloguing
  // assistant, so seeding costs no Gemini request. Only empty ones are filled.
  for (const [title, abstractEn] of Object.entries(englishAbstracts as Record<string, string>)) {
    await prisma.bibliographicRecord.updateMany({ where: { title, abstractEn: null }, data: { abstractEn } });
  }

  // Readers ------------------------------------------------------------------

  for (const label of CLASSES) {
    await prisma.schoolClass.upsert({ where: { label }, update: {}, create: { label } });
  }
  const classes = new Map(
    (await prisma.schoolClass.findMany()).map((schoolClass) => [schoolClass.label, schoolClass.id]),
  );
  const [pupilCategory, teacherCategory, active] = await Promise.all([
    prisma.patronCategory.findFirstOrThrow({ where: { label: "Élève" } }),
    prisma.patronCategory.findFirstOrThrow({ where: { label: "Enseignant" } }),
    prisma.patronStatus.findFirstOrThrow({ where: { label: "Actif" } }),
  ]);
  const membership = {
    statusId: active.id,
    locationId: location.id,
    enrolledOn: new Date(Date.UTC(2026, 8, 1)),
    expiresOn: new Date(Date.UTC(2027, 7, 31)),
  };
  const firstYear: Record<string, number> = {
    "6ème B": 2015, "5ème A": 2014, "4ème C": 2013, "3ème A": 2012,
    "2nde A": 2011, "1ère B": 2010, "Terminale A": 2009,
  };

  const reader = (barcode: string, data: Omit<Prisma.PatronUncheckedCreateInput, "barcode">) =>
    prisma.patron.upsert({ where: { barcode }, update: {}, create: { barcode, ...data } });

  const pupils = [];
  for (const [i, [lastName, firstName, gender, label]] of PUPILS.entries()) {
    pupils.push(
      await reader(`E-2026-${1001 + i}`, {
        lastName, firstName, gender,
        birthYear: firstYear[label],
        categoryId: pupilCategory.id,
        schoolClassId: classes.get(label),
        ...membership,
      }),
    );
  }
  const teachers = [];
  for (const [i, [lastName, firstName, gender, notes]] of TEACHERS.entries()) {
    teachers.push(
      await reader(`P-2026-${1001 + i}`, {
        lastName, firstName, gender, notes,
        categoryId: teacherCategory.id,
        ...membership,
      }),
    );
  }

  // The three demonstration accounts -----------------------------------------

  const teacherEmail = process.env.SEED_TEACHER_EMAIL?.trim().toLowerCase() || null;
  const studentEmail = process.env.SEED_STUDENT_EMAIL?.trim().toLowerCase() || null;

  const demoTeacher = await prisma.patron.upsert({
    where: { barcode: "P-2026-0100" },
    update: teacherEmail ? { email: teacherEmail } : {},
    create: {
      barcode: "P-2026-0100",
      lastName: "Hakizimana",
      firstName: "Claire",
      gender: "F",
      email: teacherEmail,
      notes: "Compte de démonstration — enseignante",
      categoryId: teacherCategory.id,
      ...membership,
    },
  });
  const demoStudent = await prisma.patron.upsert({
    where: { barcode: "E-2026-0100" },
    update: studentEmail ? { email: studentEmail } : {},
    create: {
      barcode: "E-2026-0100",
      lastName: "Irakoze",
      firstName: "Kevin",
      gender: "M",
      birthYear: 2013,
      email: studentEmail,
      notes: "Compte de démonstration — élève",
      categoryId: pupilCategory.id,
      schoolClassId: classes.get("4ème C"),
      ...membership,
    },
  });

  // A re-run keeps the password already in use unless one is given: the
  // seed is re-run to add data, and must not lock anyone out by surprise.
  const adminPassword = resolvePassword("SEED_ADMIN_PASSWORD");
  const adminExisted = (await prisma.staffUser.count({ where: { username: "administrateur" } })) > 0;
  const keepPassword = adminExisted && adminPassword.generated;
  const administrator = await prisma.staffUser.upsert({
    where: { username: "administrateur" },
    update: keepPassword ? {} : { passwordHash: await hashPassword(adminPassword.value), isActive: true },
    create: {
      username: "administrateur",
      passwordHash: await hashPassword(adminPassword.value),
      lastName: "Niyonzima",
      firstName: "Patrick",
      email: "administrateur@example.invalid",
    },
  });
  const adminRole = await prisma.role.findUnique({ where: { name: "Administrateur" } });
  if (!adminRole) throw new Error("No Administrateur role: run `npx tsx scripts/sync-roles.ts` first.");
  await prisma.staffUserRole.upsert({
    where: { staffUserId_roleId: { staffUserId: administrator.id, roleId: adminRole.id } },
    update: {},
    create: { staffUserId: administrator.id, roleId: adminRole.id },
  });

  // Circulation --------------------------------------------------------------

  const population = [...pupils, ...teachers, demoTeacher, demoStudent];
  const alreadyDrawn = await prisma.loan.count({
    where: { patronId: { in: population.map((patron) => patron.id) } },
  });

  if (alreadyDrawn === 0) {
    const titles = RECORDS.filter((entry) => entry.type !== "Revue").map((entry) => entry.title);
    const items = await prisma.item.findMany({
      where: {
        record: { title: { in: titles } },
        statusId: shelfStatus.id,
        loans: { none: { returnedAt: null } },
      },
      include: { record: { select: { id: true, title: true } } },
      orderBy: { id: "asc" },
    });
    const free = new Set(items.map((item) => item.id));
    const copiesOf = (title: string) => items.filter((item) => item.record?.title === title);
    const activeCount = new Map<number, number>();

    // A copy cannot go out before it was acquired.
    const heldBy = (item: (typeof items)[number], date: Date) =>
      item.acquiredOn !== null && item.acquiredOn <= date;

    async function lend(patronId: number, itemId: number, loanedDaysAgo: number, days: number) {
      const loanedAt = daysFromToday(-loanedDaysAgo);
      loanedAt.setUTCHours(10);
      const item = items.find((candidate) => candidate.id === itemId)!;
      if (!heldBy(item, loanedAt)) return;
      await prisma.loan.create({
        data: { itemId, patronId, loanedAt, dueOn: daysFromToday(days - loanedDaysAgo) },
      });
      await prisma.item.update({ where: { id: itemId }, data: { lastLoanAt: loanedAt } });
      free.delete(itemId);
      activeCount.set(patronId, (activeCount.get(patronId) ?? 0) + 1);
    }
    const lendTitle = async (patronId: number, title: string, ago: number, days: number) => {
      const copy = copiesOf(title).find((item) => free.has(item.id));
      if (copy) await lend(patronId, copy.id, ago, days);
    };

    // The pupil: one loan due soon, one overdue, so the account shows both.
    await lendTitle(demoStudent.id, "Petit Pays", 9, 14);
    await lendTitle(demoStudent.id, "Hunger Games", 18, 14);
    // The teacher: class sets for a sequence on theatre.
    await lendTitle(demoTeacher.id, "Antigone", 6, 28);
    await lendTitle(demoTeacher.id, "Le Malade imaginaire", 6, 28);
    await lendTitle(demoTeacher.id, "Le Journal d’Anne Frank", 20, 28);

    // Every copy of the first Harry Potter is out, so a reservation waits.
    for (const copy of copiesOf("Harry Potter à l’école des sorciers")) {
      if (free.has(copy.id)) await lend(pick(pupils).id, copy.id, Math.floor(rand() * 12), 14);
    }

    // Twenty more loans across the school, about one in four overdue.
    for (let n = 0; n < 20; n++) {
      const isTeacher = rand() < 0.25;
      const patron = isTeacher ? pick(teachers) : pick(pupils);
      if (!isTeacher && (activeCount.get(patron.id) ?? 0) >= (pupilCategory.loanQuota ?? 3)) continue;
      const days = isTeacher ? 28 : 14;
      const ago = rand() < 0.25 ? days + 2 + Math.floor(rand() * 15) : Math.floor(rand() * days);
      const candidates = items.filter((item) => free.has(item.id) && heldBy(item, daysFromToday(-ago)));
      if (candidates.length > 0) await lend(patron.id, pick(candidates).id, ago, days);
    }

    // Returned loans over the past six months: the history behind the shelves.
    for (let n = 0; n < 45; n++) {
      const patron = rand() < 0.2 ? pick(teachers) : pick([...pupils, demoStudent]);
      const ago = 30 + Math.floor(rand() * 90);
      const loanedAt = daysFromToday(-ago);
      loanedAt.setUTCHours(9 + Math.floor(rand() * 8));
      const owned = items.filter((candidate) => heldBy(candidate, loanedAt));
      if (owned.length === 0) continue;
      const item = pick(owned);
      const returnedAt = daysFromToday(-ago + 3 + Math.floor(rand() * 14));
      returnedAt.setUTCHours(11);
      await prisma.loan.create({
        data: {
          itemId: item.id,
          patronId: patron.id,
          loanedAt,
          dueOn: daysFromToday(-ago + 14),
          returnedAt,
        },
      });
    }

    // Reservations: the pupil waits for Harry Potter; a copy of L'Arabe du
    // futur is set aside for the teacher; two more readers queue.
    const harryPotter = copiesOf("Harry Potter à l’école des sorciers")[0]?.recordId;
    if (harryPotter) {
      await prisma.hold.create({ data: { patronId: demoStudent.id, recordId: harryPotter, placedAt: daysFromToday(-3) } });
      await prisma.hold.create({ data: { patronId: pick(pupils).id, recordId: harryPotter, placedAt: daysFromToday(-1) } });
    }
    const setAside = copiesOf("L’Arabe du futur").find((item) => free.has(item.id));
    if (setAside) {
      await prisma.hold.create({
        data: {
          patronId: demoTeacher.id,
          recordId: setAside.recordId,
          itemId: setAside.id,
          status: "AVAILABLE",
          placedAt: daysFromToday(-5),
          expiresOn: daysFromToday(5),
          pickupLocationId: location.id,
        },
      });
      free.delete(setAside.id);
    }
    const queued = await prisma.loan.findFirst({
      where: { returnedAt: null, patronId: { in: pupils.map((pupil) => pupil.id) }, item: { record: { title: { not: "Harry Potter à l’école des sorciers" } } } },
      include: { item: true },
    });
    if (queued?.item.recordId) {
      await prisma.hold.create({ data: { patronId: pick(teachers).id, recordId: queued.item.recordId, placedAt: daysFromToday(-2) } });
    }
  }

  const [records, copies, readers, loans, holds] = await Promise.all([
    prisma.bibliographicRecord.count(),
    prisma.item.count(),
    prisma.patron.count(),
    prisma.loan.count({ where: { returnedAt: null } }),
    prisma.hold.count({ where: { status: { in: ["PENDING", "AVAILABLE"] } } }),
  ]);
  console.log(`Demo records created: ${created}`);
  console.log(`Totals: ${records} records, ${copies} copies, ${readers} readers, ${loans} open loans, ${holds} open holds`);
  console.log("");
  console.log("Demonstration accounts:");
  console.log(
    `  Administrateur  Gestion, username ${administrator.username}, password ${keepPassword ? "unchanged (set SEED_ADMIN_PASSWORD to reset it)" : `${adminPassword.value}${adminPassword.generated ? "  (generated)" : "  (from env)"}`}`,
  );
  console.log(
    `  Enseignant      OPAC, card ${demoTeacher.barcode}, Google ${teacherEmail ?? "— set SEED_TEACHER_EMAIL and re-run"}`,
  );
  console.log(
    `  Élève           OPAC, card ${demoStudent.barcode}, Google ${studentEmail ?? "— set SEED_STUDENT_EMAIL and re-run"}`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
