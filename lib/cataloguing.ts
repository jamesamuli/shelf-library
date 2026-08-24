import { Prisma } from "../generated/prisma/client";
import { prisma } from "./prisma";

/**
 * Back-office cataloguing: records and their copies.
 *
 * The rules legacy enforces, and the ones we drop, are in
 * docs/12-cataloguing.md. Failures come back as codes; the UI owns wording.
 *
 * SERVER ONLY.
 */

export type RecordInput = {
  title: string;
  subtitle: string;
  standardNumber: string;
  publicationYear: string;
  abstract: string;
  documentTypeId: string;
  statusId: string;
  /** One `Surname, Forename` per line. */
  authors: string;
  /** One name per line. */
  publishers: string;
  /** One subject per line. */
  subjects: string;
};

export type FieldError = "TITLE_REQUIRED" | "YEAR_INVALID";

export type SaveRecordResult =
  | { ok: true; id: number }
  | { ok: false; errors: Partial<Record<"title" | "publicationYear", FieldError>> };

export type ItemInput = {
  barcode: string;
  callNumber: string;
  locationId: string;
  sectionId: string;
  statusId: string;
};

export type SaveItemResult =
  | { ok: true; id: number }
  | { ok: false; reason: "BARCODE_REQUIRED" | "BARCODE_TAKEN" | "RECORD_NOT_FOUND" };

export type DeleteResult =
  | { ok: true }
  | { ok: false; reason: "HAS_COPIES" | "ON_LOAN" | "NOT_FOUND"; detail?: string };

/** Blank lines and stray whitespace are the norm in a textarea. */
function lines(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/** `Surname, Forename` — the order a librarian writes a heading in. */
function splitName(entry: string): { name: string; forename: string | null } {
  const [name, ...rest] = entry.split(",");
  const forename = rest.join(",").trim();
  return { name: name.trim(), forename: forename || null };
}

function optionalId(value: string): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

/**
 * Authorities are found or created, never silently duplicated. Matching is
 * exact on the written form — normalising further would merge two people who
 * genuinely share a name.
 */
async function resolveAuthors(entries: string[]): Promise<number[]> {
  const ids: number[] = [];
  for (const entry of entries) {
    const { name, forename } = splitName(entry);
    const existing = await prisma.author.findFirst({ where: { name, forename } });
    const author = existing ?? (await prisma.author.create({ data: { name, forename } }));
    ids.push(author.id);
  }
  return ids;
}

async function resolvePublishers(names: string[]): Promise<number[]> {
  const ids: number[] = [];
  for (const name of names) {
    const existing = await prisma.publisher.findFirst({ where: { name } });
    const publisher = existing ?? (await prisma.publisher.create({ data: { name } }));
    ids.push(publisher.id);
  }
  return ids;
}

/** A subject is an id with labels; we create the French label. */
async function resolveSubjects(labels: string[]): Promise<number[]> {
  const ids: number[] = [];
  for (const label of labels) {
    const existing = await prisma.subjectLabel.findFirst({ where: { label } });
    if (existing) {
      ids.push(existing.subjectId);
      continue;
    }
    const subject = await prisma.subject.create({ data: {} });
    await prisma.subjectLabel.create({
      data: { subjectId: subject.id, languageCode: "fr", label },
    });
    ids.push(subject.id);
  }
  return ids;
}

function validate(input: RecordInput) {
  const errors: Partial<Record<"title" | "publicationYear", FieldError>> = {};
  if (!input.title.trim()) errors.title = "TITLE_REQUIRED";

  const year = input.publicationYear.trim();
  if (year && !/^\d{4}$/.test(year)) errors.publicationYear = "YEAR_INVALID";

  return errors;
}

export async function saveRecord(
  id: number | null,
  input: RecordInput,
): Promise<SaveRecordResult> {
  const errors = validate(input);
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const [authorIds, publisherIds, subjectIds] = await Promise.all([
    resolveAuthors(lines(input.authors)),
    resolvePublishers(lines(input.publishers)),
    resolveSubjects(lines(input.subjects)),
  ]);

  const scalars = {
    title: input.title.trim(),
    subtitle: input.subtitle.trim() || null,
    standardNumber: input.standardNumber.trim() || null,
    publicationYear: input.publicationYear.trim()
      ? Number(input.publicationYear)
      : null,
    abstract: input.abstract.trim() || null,
    documentTypeId: optionalId(input.documentTypeId),
    statusId: optionalId(input.statusId),
  };

  // Links are replaced wholesale: the form shows the complete set, so what
  // it submits is the complete set. Rank follows the order they were typed.
  const links = {
    contributions: {
      create: authorIds.map((authorId, index) => ({
        authorId,
        relatorCode: "070",
        rank: index,
      })),
    },
    recordPublishers: {
      create: publisherIds.map((publisherId, index) => ({
        publisherId,
        rank: index,
      })),
    },
    recordSubjects: {
      create: subjectIds.map((subjectId, index) => ({ subjectId, rank: index })),
    },
  };

  if (id === null) {
    const created = await prisma.bibliographicRecord.create({
      data: { ...scalars, ...links },
    });
    return { ok: true, id: created.id };
  }

  await prisma.$transaction([
    prisma.contribution.deleteMany({ where: { recordId: id } }),
    prisma.recordPublisher.deleteMany({ where: { recordId: id } }),
    prisma.recordSubject.deleteMany({ where: { recordId: id } }),
    prisma.bibliographicRecord.update({
      where: { id },
      data: { ...scalars, ...links },
    }),
  ]);
  return { ok: true, id };
}

/** Legacy refused too, but only said "impossible". Ours says how many. */
export async function deleteRecord(id: number): Promise<DeleteResult> {
  const copies = await prisma.item.count({ where: { recordId: id } });
  if (copies > 0) {
    return { ok: false, reason: "HAS_COPIES", detail: String(copies) };
  }

  try {
    await prisma.bibliographicRecord.delete({ where: { id } });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return { ok: false, reason: "NOT_FOUND" };
    }
    throw error;
  }
  return { ok: true };
}

export async function saveItem(
  recordId: number,
  itemId: number | null,
  input: ItemInput,
): Promise<SaveItemResult> {
  const barcode = input.barcode.trim();
  if (!barcode) return { ok: false, reason: "BARCODE_REQUIRED" };

  const data = {
    barcode,
    callNumber: input.callNumber.trim() || null,
    locationId: optionalId(input.locationId),
    sectionId: optionalId(input.sectionId),
    statusId: optionalId(input.statusId),
  };

  try {
    // The unique index decides, not a SELECT first: legacy's check-then-insert
    // races two librarians typing the same barcode.
    const saved =
      itemId === null
        ? await prisma.item.create({ data: { ...data, recordId } })
        : await prisma.item.update({ where: { id: itemId }, data });
    return { ok: true, id: saved.id };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") return { ok: false, reason: "BARCODE_TAKEN" };
      if (error.code === "P2003" || error.code === "P2025") {
        return { ok: false, reason: "RECORD_NOT_FOUND" };
      }
    }
    throw error;
  }
}

export async function deleteItem(itemId: number): Promise<DeleteResult> {
  const onLoan = await prisma.loan.findFirst({
    where: { itemId, returnedAt: null },
    include: { patron: { select: { lastName: true, firstName: true } } },
  });
  if (onLoan) {
    return {
      ok: false,
      reason: "ON_LOAN",
      detail: [onLoan.patron.firstName, onLoan.patron.lastName]
        .filter(Boolean)
        .join(" "),
    };
  }

  try {
    // Returned loans reference the copy; they are history, so they go with it.
    await prisma.$transaction([
      prisma.loan.deleteMany({ where: { itemId } }),
      prisma.item.delete({ where: { id: itemId } }),
    ]);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return { ok: false, reason: "NOT_FOUND" };
    }
    throw error;
  }
  return { ok: true };
}

const PAGE_SIZE = 20;

/** Staff record list: everything, including records hidden from the OPAC. */
export async function listRecords(query: string, page: number) {
  const term = query.trim();
  const where: Prisma.BibliographicRecordWhereInput = term
    ? {
        OR: [
          { title: { contains: term, mode: "insensitive" } },
          { standardNumber: { contains: term, mode: "insensitive" } },
          {
            contributions: {
              some: { author: { name: { contains: term, mode: "insensitive" } } },
            },
          },
        ],
      }
    : {};

  const currentPage = Math.max(1, page);
  const [rows, total] = await Promise.all([
    prisma.bibliographicRecord.findMany({
      where,
      include: {
        documentType: true,
        status: true,
        contributions: { include: { author: true }, orderBy: { rank: "asc" } },
        _count: { select: { items: true } },
      },
      orderBy: { title: "asc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.bibliographicRecord.count({ where }),
  ]);

  return {
    rows: rows.map((row) => ({
      id: row.id,
      title: row.title,
      authors: row.contributions
        .map((c) => [c.author.forename, c.author.name].filter(Boolean).join(" "))
        .join(", "),
      documentType: row.documentType?.label ?? null,
      status: row.status?.label ?? null,
      copies: row._count.items,
    })),
    total,
    page: currentPage,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

/** The record as the edit form needs it, plus its copies. */
export async function getRecordForEdit(id: number) {
  const record = await prisma.bibliographicRecord.findUnique({
    where: { id },
    include: {
      contributions: { include: { author: true }, orderBy: { rank: "asc" } },
      recordPublishers: { include: { publisher: true }, orderBy: { rank: "asc" } },
      recordSubjects: {
        include: { subject: { include: { labels: true } } },
        orderBy: { rank: "asc" },
      },
      items: {
        include: {
          location: true,
          section: true,
          status: true,
          loans: { where: { returnedAt: null }, take: 1 },
        },
        orderBy: { barcode: "asc" },
      },
    },
  });
  if (!record) return null;

  return {
    id: record.id,
    values: {
      title: record.title,
      subtitle: record.subtitle ?? "",
      standardNumber: record.standardNumber ?? "",
      publicationYear: record.publicationYear?.toString() ?? "",
      abstract: record.abstract ?? "",
      documentTypeId: record.documentTypeId?.toString() ?? "",
      statusId: record.statusId?.toString() ?? "",
      authors: record.contributions
        .map((c) =>
          c.author.forename ? `${c.author.name}, ${c.author.forename}` : c.author.name,
        )
        .join("\n"),
      publishers: record.recordPublishers.map((p) => p.publisher.name).join("\n"),
      subjects: record.recordSubjects
        .map((s) => s.subject.labels[0]?.label ?? "")
        .filter(Boolean)
        .join("\n"),
    } satisfies RecordInput,
    items: record.items.map((item) => ({
      id: item.id,
      barcode: item.barcode,
      callNumber: item.callNumber ?? "",
      locationId: item.locationId?.toString() ?? "",
      sectionId: item.sectionId?.toString() ?? "",
      statusId: item.statusId?.toString() ?? "",
      location: item.location?.label ?? null,
      section: item.section?.label ?? null,
      status: item.status?.label ?? null,
      isOnLoan: item.loans.length > 0,
    })),
  };
}

/**
 * Every dropdown the two forms need, in one round trip — `id` and `label`
 * only, since these cross into Client Components. `itemStatus` in particular
 * carries the `allowsLoan` flag the desk enforces server-side; the browser has
 * no business seeing it.
 */
const OPTION = { id: true, label: true } as const;

export async function getCataloguingOptions() {
  const [documentTypes, recordStatuses, locations, sections, itemStatuses] =
    await Promise.all([
      prisma.documentType.findMany({ select: OPTION, orderBy: { label: "asc" } }),
      prisma.recordStatus.findMany({ select: OPTION, orderBy: { label: "asc" } }),
      prisma.location.findMany({ select: OPTION, orderBy: { label: "asc" } }),
      prisma.section.findMany({ select: OPTION, orderBy: { label: "asc" } }),
      prisma.itemStatus.findMany({ select: OPTION, orderBy: { label: "asc" } }),
    ]);
  return { documentTypes, recordStatuses, locations, sections, itemStatuses };
}

export const EMPTY_RECORD: RecordInput = {
  title: "",
  subtitle: "",
  standardNumber: "",
  publicationYear: "",
  abstract: "",
  documentTypeId: "",
  statusId: "",
  authors: "",
  publishers: "",
  subjects: "",
};
