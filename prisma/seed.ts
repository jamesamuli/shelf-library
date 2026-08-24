import { randomBytes } from "node:crypto";
import { prisma } from "../lib/prisma";
import { hashPassword } from "../app/(auth)/_lib/password";

/**
 * Seed passwords are never hardcoded. Set SEED_STAFF_PASSWORD /
 * SEED_PATRON_PASSWORD to choose them; otherwise a random one is generated and
 * printed once below. Re-running resets the seeded accounts to the resolved
 * password, so what is printed is always what works.
 */
function resolvePassword(envVar: string) {
  const fromEnv = process.env[envVar];
  return fromEnv
    ? { value: fromEnv, generated: false }
    : { value: randomBytes(9).toString("base64url"), generated: true };
}


/**
 * The upserts above pin explicit ids, which does NOT advance Postgres's
 * identity sequence — the next auto-id insert would collide on id=1. Bump each
 * sequence past the highest existing row before creating anything without an
 * explicit id.
 */
async function syncSequences(tables: string[]) {
  for (const table of tables) {
    await prisma.$executeRawUnsafe(
      `SELECT setval(
         pg_get_serial_sequence('"${table}"', 'id'),
         GREATEST(COALESCE((SELECT MAX(id) FROM "${table}"), 0), 1)
       )`,
    );
  }
}

// Idempotent: explicit ids + upsert, so re-running does not duplicate rows.
async function main() {
  const [documentType, recordStatus, location, section, itemStatus] =
    await Promise.all([
      prisma.documentType.upsert({
        where: { id: 1 },
        update: {},
        create: { id: 1, label: "Livre" },
      }),
      prisma.recordStatus.upsert({
        where: { id: 1 },
        update: {},
        create: { id: 1, label: "Catalogué", opacLabel: "Disponible" },
      }),
      prisma.location.upsert({
        where: { id: 1 },
        update: {},
        create: { id: 1, label: "CDI" },
      }),
      prisma.section.upsert({
        where: { id: 1 },
        update: {},
        create: { id: 1, label: "Documentaires" },
      }),
      prisma.itemStatus.upsert({
        where: { id: 1 },
        update: {},
        create: { id: 1, label: "En rayon", allowsLoan: true },
      }),
    ]);

  // Exercises the overridable "not for loan" refusal at the desk.
  const referenceStatus = await prisma.itemStatus.upsert({
    where: { id: 2 },
    update: {},
    create: { id: 2, label: "Consultation sur place", allowsLoan: false },
  });

  const author = await prisma.author.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: "Bachelard",
      forename: "Gaston",
      dates: "1884-1962",
      authorType: "PERSON",
    },
  });

  const publisher = await prisma.publisher.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, name: "Presses Universitaires de France", city: "Paris" },
  });

  const record = await prisma.bibliographicRecord.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      title: "La Poétique de l’espace",
      publicationYear: 1957,
      standardNumber: "9782130549307",
      documentTypeId: documentType.id,
      statusId: recordStatus.id,
      bibliographicLevel: "MONOGRAPH",
    },
  });

  await prisma.recordPublisher.upsert({
    where: {
      recordId_publisherId: { recordId: record.id, publisherId: publisher.id },
    },
    update: {},
    create: { recordId: record.id, publisherId: publisher.id },
  });

  await prisma.contribution.upsert({
    where: {
      recordId_authorId_relatorCode_level: {
        recordId: record.id,
        authorId: author.id,
        relatorCode: "070",
        level: "PRIMARY",
      },
    },
    update: {},
    create: {
      recordId: record.id,
      authorId: author.id,
      relatorCode: "070", // UNIMARC: author
      level: "PRIMARY",
    },
  });

  // record_id set, issue_id null — satisfies the items_record_xor_issue CHECK.
  const item = await prisma.item.upsert({
    where: { barcode: "CDI-000001" },
    update: {},
    create: {
      barcode: "CDI-000001",
      callNumber: "100 BAC",
      recordId: record.id,
      locationId: location.id,
      sectionId: section.id,
      statusId: itemStatus.id,
    },
  });

  // A second copy of the same title, not for loan.
  await prisma.item.upsert({
    where: { barcode: "CDI-000002" },
    update: {},
    create: {
      barcode: "CDI-000002",
      callNumber: "100 BAC",
      recordId: record.id,
      locationId: location.id,
      sectionId: section.id,
      statusId: referenceStatus.id,
    },
  });

  const [patronCategory, patronStatus] = await Promise.all([
    prisma.patronCategory.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1, label: "Élève", loanQuota: 3, loanDurationDays: 14 },
    }),
    prisma.patronStatus.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1, label: "Actif" },
    }),
  ]);

  // A couple of classes so the import template works against real data.
  for (const label of ["6ème B", "5ème A", "4ème C", "3ème A"]) {
    const existing = await prisma.schoolClass.findUnique({ where: { label } });
    if (!existing) await prisma.schoolClass.create({ data: { label } });
  }

  // No quota, longer loans — the second half of the duration/quota rules.
  const staffCategory = await prisma.patronCategory.upsert({
    where: { id: 2 },
    update: {},
    create: { id: 2, label: "Enseignant", loanDurationDays: 28 },
  });

  const staffPassword = resolvePassword("SEED_STAFF_PASSWORD");
  const patronPassword = resolvePassword("SEED_PATRON_PASSWORD");

  const staffUser = await prisma.staffUser.upsert({
    where: { username: "bibliothecaire" },
    update: { passwordHash: await hashPassword(staffPassword.value) },
    create: {
      username: "bibliothecaire",
      passwordHash: await hashPassword(staffPassword.value),
      lastName: "Martin",
      firstName: "Hélène",
      email: "documentation@example.invalid",
    },
  });

  const patronPasswordHash = await hashPassword(patronPassword.value);
  const patron = await prisma.patron.upsert({
    where: { barcode: "E-2026-0001" },
    update: { passwordHash: patronPasswordHash },
    create: {
      barcode: "E-2026-0001",
      lastName: "Durand",
      firstName: "Camille",
      passwordHash: patronPasswordHash,
      categoryId: patronCategory.id,
      statusId: patronStatus.id,
      locationId: location.id,
    },
  });

  // Desk-only patrons: no password, so neither can sign into the OPAC. They
  // exist to exercise the check-out refusals — an expired card, and a reader
  // with no quota.
  const expired = new Date();
  expired.setFullYear(expired.getFullYear() - 1);
  await prisma.patron.upsert({
    where: { barcode: "E-2025-0009" },
    update: { expiresOn: expired },
    create: {
      barcode: "E-2025-0009",
      lastName: "Leroy",
      firstName: "Adrien",
      categoryId: patronCategory.id,
      statusId: patronStatus.id,
      locationId: location.id,
      expiresOn: expired,
    },
  });
  await prisma.patron.upsert({
    where: { barcode: "P-2026-0002" },
    update: {},
    create: {
      barcode: "P-2026-0002",
      lastName: "Nkurunziza",
      firstName: "Aline",
      categoryId: staffCategory.id,
      statusId: patronStatus.id,
      locationId: location.id,
    },
  });

  // Open loan: returned_at NULL, so the one_active_loan_per_item partial
  // unique index applies to this row.
  const existingLoan = await prisma.loan.findFirst({
    where: { itemId: item.id, returnedAt: null },
  });
  if (!existingLoan) {
    const dueOn = new Date();
    dueOn.setDate(dueOn.getDate() + 14);
    await prisma.loan.create({
      data: { itemId: item.id, patronId: patron.id, dueOn },
    });
  }


  await syncSequences([
    "document_types",
    "record_statuses",
    "locations",
    "sections",
    "item_statuses",
    "authors",
    "publishers",
    "bibliographic_records",
    "patron_categories",
    "patron_statuses",
  ]);

  // A small catalogue so search has something to rank. Titles chosen to
  // exercise accents, stopwords and shared authors.
  const CATALOGUE = [
    { title: "L’Étranger", year: 1942, isbn: "9782070360024", author: { name: "Camus", forename: "Albert" }, subject: "Roman", abstract: "Meursault, employé de bureau à Alger, apprend la mort de sa mère." },
    { title: "La Peste", year: 1947, isbn: "9782070360420", author: { name: "Camus", forename: "Albert" }, subject: "Roman", abstract: "La ville d’Oran est frappée par une épidémie de peste." },
    { title: "1984", year: 1949, isbn: "9782070368228", author: { name: "Orwell", forename: "George" }, subject: "Science-fiction", abstract: "Winston Smith vit sous la surveillance permanente de Big Brother." },
    { title: "Sapiens : une brève histoire de l’humanité", year: 2011, isbn: "9782226257017", author: { name: "Harari", forename: "Yuval Noah" }, subject: "Histoire", abstract: "Une histoire de l’espèce humaine, de la préhistoire à aujourd’hui." },
    { title: "Devenir", year: 2018, isbn: "9782081471757", author: { name: "Obama", forename: "Michelle" }, subject: "Biographie", abstract: "Les mémoires de l’ancienne première dame des États-Unis." },
  ];

  const subjectIds = new Map<string, number>();
  for (const entry of CATALOGUE) {
    if (subjectIds.has(entry.subject)) continue;
    const existingLabel = await prisma.subjectLabel.findFirst({
      where: { label: entry.subject },
    });
    if (existingLabel) {
      subjectIds.set(entry.subject, existingLabel.subjectId);
      continue;
    }
    const subject = await prisma.subject.create({ data: {} });
    await prisma.subjectLabel.create({
      data: { subjectId: subject.id, languageCode: "fr", label: entry.subject },
    });
    subjectIds.set(entry.subject, subject.id);
  }

  let barcodeSeq = 2;
  for (const entry of CATALOGUE) {
    const existing = await prisma.bibliographicRecord.findFirst({
      where: { title: entry.title },
    });
    if (existing) continue;

    let entryAuthor = await prisma.author.findFirst({
      where: { name: entry.author.name, forename: entry.author.forename },
    });
    entryAuthor ??= await prisma.author.create({
      data: { name: entry.author.name, forename: entry.author.forename },
    });

    const created = await prisma.bibliographicRecord.create({
      data: {
        title: entry.title,
        publicationYear: entry.year,
        standardNumber: entry.isbn,
        abstract: entry.abstract,
        documentTypeId: documentType.id,
        statusId: recordStatus.id,
        contributions: {
          create: { authorId: entryAuthor.id, relatorCode: "070", level: "PRIMARY" },
        },
        recordPublishers: { create: { publisherId: publisher.id } },
        recordSubjects: { create: { subjectId: subjectIds.get(entry.subject)! } },
      },
    });

    await prisma.item.create({
      data: {
        barcode: `CDI-${String(++barcodeSeq).padStart(6, "0")}`,
        callNumber: `${entry.author.name.slice(0, 3).toUpperCase()}`,
        recordId: created.id,
        locationId: location.id,
        sectionId: section.id,
        statusId: itemStatus.id,
      },
    });
  }

  console.log(`Seeded catalogue: ${await prisma.bibliographicRecord.count()} records, ${await prisma.item.count()} items`);
  console.log("");
  console.log("Sign-in accounts:");
  console.log(
    `  Gestion   username ${staffUser.username}   password ${staffPassword.value}${staffPassword.generated ? "  (generated)" : "  (from env)"}`,
  );
  console.log(
    `  Catalogue card     ${patron.barcode}   password ${patronPassword.value}${patronPassword.generated ? "  (generated)" : "  (from env)"}`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
