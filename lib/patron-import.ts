import { prisma } from "./prisma";
import {
  currentSchoolYear,
  nextBarcode,
  normaliseEmail,
  type PatronField,
  type PatronFieldError,
} from "./patrons";

/**
 * Bulk reader import from CSV.
 *
 * CSV only, by decision: real .xlsx parsing needs a dependency, and a French
 * spreadsheet exports CSV natively. What that costs us is handled below —
 * Excel here writes `;`-separated, Latin-1-ish, BOM-prefixed files, so the
 * parser copes with all three rather than assuming RFC 4180.
 *
 * SERVER ONLY.
 */

/** Header → field. Accents and case are normalised before lookup. */
const COLUMNS = {
  email: "email",
  nom: "lastName",
  prenom: "firstName",
  classe: "schoolClass",
  code_barres: "barcode",
  sexe: "gender",
  date_adhesion: "enrolledOn",
  date_expiration: "expiresOn",
  categorie: "category",
  statut: "status",
} as const;

export const TEMPLATE_HEADERS = Object.keys(COLUMNS);

export type ImportRowError =
  | { field: PatronField | "category" | "status"; code: PatronFieldError | "UNKNOWN" }
  | { field: "email"; code: "DUPLICATE_IN_FILE" };

export type PreviewRow = {
  /** 1-based, counting the header, so it matches what the spreadsheet shows. */
  line: number;
  email: string;
  lastName: string;
  firstName: string;
  schoolClass: string;
  barcode: string;
  errors: ImportRowError[];
};

export type Preview = {
  rows: PreviewRow[];
  validCount: number;
  rejectedCount: number;
  /** Set when the file itself is unusable, in which case rows is empty. */
  fileError?: "EMPTY" | "NO_EMAIL_COLUMN";
};

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function normaliseHeader(value: string): string {
  return stripAccents(value.trim().toLowerCase()).replace(/[\s-]+/g, "_");
}

/**
 * Minimal RFC 4180 reader: quoted fields, doubled quotes inside them, and
 * newlines inside quotes. Delimiter is sniffed from the header line because
 * French Excel writes `;` and everything else writes `,`.
 */
export function parseCsv(text: string): string[][] {
  const input = text.replace(/^﻿/, "");
  const headerLine = input.slice(0, input.search(/\r?\n|$/));
  const delimiter =
    (headerLine.match(/;/g)?.length ?? 0) > (headerLine.match(/,/g)?.length ?? 0)
      ? ";"
      : ",";

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (quoted) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // Trailing blank lines are what a spreadsheet leaves behind, not data.
  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ""));
}

export function templateCsv(): string {
  const year = currentSchoolYear();
  const start = year.startsOn.toISOString().slice(0, 10);
  const end = year.endsOn.toISOString().slice(0, 10);
  return [
    TEMPLATE_HEADERS.join(";"),
    `marie.dupont@ecole.fr;Dupont;Marie;6eme B;;F;${start};${end};Élève;Actif`,
    `lucas.martin@ecole.fr;Martin;Lucas;6eme B;;M;;;;`,
    `sofia.rossi@ecole.fr;Rossi;Sofia;5eme A;E-2026-0500;F;;;;`,
  ].join("\r\n");
}

// ---------------------------------------------------------------------------
// Preview
// ---------------------------------------------------------------------------

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseDateCell(value: string): Date | null | "invalid" {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const french = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!french && !iso) return "invalid";
  const [year, month, day] = french
    ? [Number(french[3]), Number(french[2]), Number(french[1])]
    : [Number(iso![1]), Number(iso![2]), Number(iso![3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return "invalid";
  return date;
}

type Prepared = {
  row: PreviewRow;
  data: {
    email: string;
    lastName: string;
    firstName: string;
    barcode: string;
    gender: string | null;
    schoolClassId: number | null;
    categoryId: number | null;
    statusId: number | null;
    enrolledOn: Date;
    expiresOn: Date;
  } | null;
};

/**
 * Reads the file and judges every row without writing anything. The librarian
 * sees this before deciding, which is what makes importing only the valid rows
 * defensible rather than silent.
 */
export async function previewImport(text: string): Promise<Preview> {
  const table = parseCsv(text);
  if (table.length < 2) {
    return { rows: [], validCount: 0, rejectedCount: 0, fileError: "EMPTY" };
  }

  const headers = table[0].map(normaliseHeader);
  const indexOf = (column: keyof typeof COLUMNS) => headers.indexOf(column);
  if (indexOf("email") === -1) {
    return { rows: [], validCount: 0, rejectedCount: 0, fileError: "NO_EMAIL_COLUMN" };
  }

  const [classes, categories, statuses] = await Promise.all([
    prisma.schoolClass.findMany(),
    prisma.patronCategory.findMany(),
    prisma.patronStatus.findMany(),
  ]);
  const byLabel = <T extends { label: string }>(rows: T[]) =>
    new Map(rows.map((r) => [stripAccents(r.label.toLowerCase()), r]));
  const classMap = byLabel(classes);
  const categoryMap = byLabel(categories);
  const statusMap = byLabel(statuses);

  const year = currentSchoolYear();
  const cell = (cells: string[], column: keyof typeof COLUMNS) => {
    const index = indexOf(column);
    return index === -1 ? "" : (cells[index] ?? "").trim();
  };

  const prepared: Prepared[] = [];
  const seenEmails = new Set<string>();

  for (let i = 1; i < table.length; i++) {
    const cells = table[i];
    const errors: ImportRowError[] = [];

    const email = normaliseEmail(cell(cells, "email"));
    const lastName = cell(cells, "nom");
    const firstName = cell(cells, "prenom");
    const barcode = cell(cells, "code_barres");
    const className = cell(cells, "classe");
    const categoryName = cell(cells, "categorie");
    const statusName = cell(cells, "statut");

    if (!email) errors.push({ field: "email", code: "REQUIRED" });
    else if (!EMAIL.test(email)) errors.push({ field: "email", code: "EMAIL_INVALID" });
    else if (seenEmails.has(email)) {
      errors.push({ field: "email", code: "DUPLICATE_IN_FILE" });
    }
    if (email) seenEmails.add(email);

    if (!lastName) errors.push({ field: "lastName", code: "REQUIRED" });
    if (!firstName) errors.push({ field: "firstName", code: "REQUIRED" });

    const schoolClass = className
      ? classMap.get(stripAccents(className.toLowerCase()))
      : undefined;
    if (className && !schoolClass) {
      errors.push({ field: "schoolClassId", code: "CLASS_UNKNOWN" });
    }

    const category = categoryName
      ? categoryMap.get(stripAccents(categoryName.toLowerCase()))
      : undefined;
    if (categoryName && !category) errors.push({ field: "category", code: "UNKNOWN" });

    const status = statusName
      ? statusMap.get(stripAccents(statusName.toLowerCase()))
      : undefined;
    if (statusName && !status) errors.push({ field: "status", code: "UNKNOWN" });

    const enrolled = parseDateCell(cell(cells, "date_adhesion"));
    const expires = parseDateCell(cell(cells, "date_expiration"));
    if (enrolled === "invalid") errors.push({ field: "enrolledOn", code: "DATE_INVALID" });
    if (expires === "invalid") errors.push({ field: "expiresOn", code: "DATE_INVALID" });

    const enrolledOn = enrolled === "invalid" ? null : (enrolled ?? year.startsOn);
    const expiresOn = expires === "invalid" ? null : (expires ?? year.endsOn);
    if (enrolledOn && expiresOn && expiresOn < enrolledOn) {
      errors.push({ field: "expiresOn", code: "DATE_ORDER" });
    }

    const gender = cell(cells, "sexe").toUpperCase();

    prepared.push({
      row: {
        line: i + 1,
        email,
        lastName,
        firstName,
        schoolClass: className,
        barcode,
        errors,
      },
      data:
        errors.length > 0 || !enrolledOn || !expiresOn
          ? null
          : {
              email,
              lastName,
              firstName,
              barcode,
              gender: gender === "F" || gender === "M" ? gender : null,
              schoolClassId: schoolClass?.id ?? null,
              categoryId: category?.id ?? null,
              statusId: status?.id ?? null,
              enrolledOn,
              expiresOn,
            },
    });
  }

  // Clashes with readers who already exist, checked in one query for the file.
  const emails = prepared.map((p) => p.row.email).filter(Boolean);
  const barcodes = prepared.map((p) => p.row.barcode).filter(Boolean);
  const existing = await prisma.patron.findMany({
    where: { OR: [{ email: { in: emails } }, { barcode: { in: barcodes } }] },
    select: { email: true, barcode: true },
  });
  const takenEmails = new Set(existing.map((p) => p.email).filter(Boolean));
  const takenBarcodes = new Set(existing.map((p) => p.barcode));

  for (const item of prepared) {
    if (item.row.email && takenEmails.has(item.row.email)) {
      item.row.errors.push({ field: "email", code: "EMAIL_TAKEN" });
      item.data = null;
    }
    if (item.row.barcode && takenBarcodes.has(item.row.barcode)) {
      item.row.errors.push({ field: "barcode", code: "BARCODE_TAKEN" });
      item.data = null;
    }
  }

  const rows = prepared.map((p) => p.row);
  return {
    rows,
    validCount: prepared.filter((p) => p.data !== null).length,
    rejectedCount: prepared.filter((p) => p.data === null).length,
  };
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

export type ImportResult = {
  created: number;
  rejected: PreviewRow[];
  fileError?: Preview["fileError"];
};

/**
 * Re-reads and re-judges the file rather than trusting a preview round-trip,
 * then writes the valid rows in one transaction. Rejected rows come back so
 * the UI can hand them to the librarian as a file to fix.
 */
export async function importPatrons(text: string): Promise<ImportResult> {
  const preview = await previewImport(text);
  if (preview.fileError) {
    return { created: 0, rejected: [], fileError: preview.fileError };
  }

  const table = parseCsv(text);
  const headers = table[0].map(normaliseHeader);
  const valid = preview.rows.filter((row) => row.errors.length === 0);
  const rejected = preview.rows.filter((row) => row.errors.length > 0);
  if (valid.length === 0) return { created: 0, rejected };

  const year = currentSchoolYear();
  let sequence = Number(
    (await nextBarcode(year.startsOn.getUTCFullYear())).split("-")[2],
  );
  const prefix = `E-${year.startsOn.getUTCFullYear()}-`;

  const cellOf = (line: number, column: keyof typeof COLUMNS) => {
    const index = headers.indexOf(column);
    return index === -1 ? "" : (table[line - 1]?.[index] ?? "").trim();
  };

  const [classes, categories, statuses] = await Promise.all([
    prisma.schoolClass.findMany(),
    prisma.patronCategory.findMany(),
    prisma.patronStatus.findMany(),
  ]);
  const find = <T extends { label: string; id: number }>(rows: T[], label: string) =>
    rows.find((r) => stripAccents(r.label.toLowerCase()) === stripAccents(label.toLowerCase()));

  const data = valid.map((row) => {
    const className = cellOf(row.line, "classe");
    const categoryName = cellOf(row.line, "categorie");
    const statusName = cellOf(row.line, "statut");
    const enrolled = parseDateCell(cellOf(row.line, "date_adhesion"));
    const expires = parseDateCell(cellOf(row.line, "date_expiration"));
    const gender = cellOf(row.line, "sexe").toUpperCase();

    return {
      barcode: row.barcode || `${prefix}${String(sequence++).padStart(4, "0")}`,
      lastName: row.lastName,
      firstName: row.firstName,
      email: row.email,
      login: row.email,
      gender: gender === "F" || gender === "M" ? gender : null,
      schoolClassId: className ? (find(classes, className)?.id ?? null) : null,
      categoryId: categoryName ? (find(categories, categoryName)?.id ?? null) : null,
      statusId: statusName ? (find(statuses, statusName)?.id ?? null) : null,
      enrolledOn: enrolled instanceof Date ? enrolled : year.startsOn,
      expiresOn: expires instanceof Date ? expires : year.endsOn,
    };
  });

  // One statement, one transaction: several hundred students is a single
  // round trip rather than several hundred.
  const result = await prisma.patron.createMany({ data, skipDuplicates: true });

  return { created: result.count, rejected };
}

/** The rejected rows, as a file the librarian can fix and re-import. */
export function rejectedCsv(rows: PreviewRow[], reason: (row: PreviewRow) => string): string {
  return [
    ["ligne", ...TEMPLATE_HEADERS, "erreur"].join(";"),
    ...rows.map((row) =>
      [
        row.line,
        row.email,
        row.lastName,
        row.firstName,
        row.schoolClass,
        row.barcode,
        "",
        "",
        "",
        "",
        "",
        `"${reason(row).replace(/"/g, '""')}"`,
      ].join(";"),
    ),
  ].join("\r\n");
}
