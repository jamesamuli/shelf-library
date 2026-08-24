import { Prisma } from "../generated/prisma/client";
import { prisma } from "./prisma";

/**
 * Readers: creation and bulk import.
 *
 * Unlike legacy PMB, the school email is the entry point and the OPAC login —
 * see docs/13-readers.md. Refusals are codes; the UI owns the wording.
 *
 * SERVER ONLY.
 */

export type PatronInput = {
  email: string;
  lastName: string;
  firstName: string;
  /** Blank means "generate one". */
  barcode: string;
  /** Blank means "same as the email". */
  login: string;
  gender: string;
  schoolClassId: string;
  categoryId: string;
  statusId: string;
  enrolledOn: string;
  expiresOn: string;
  notes: string;
};

export type PatronField =
  | "email"
  | "lastName"
  | "firstName"
  | "barcode"
  | "login"
  | "enrolledOn"
  | "expiresOn"
  | "schoolClassId";

export type PatronFieldError =
  | "REQUIRED"
  | "EMAIL_INVALID"
  | "EMAIL_TAKEN"
  | "BARCODE_TAKEN"
  | "LOGIN_TAKEN"
  | "DATE_INVALID"
  | "DATE_ORDER"
  | "CLASS_UNKNOWN";

export type PatronErrors = Partial<Record<PatronField, PatronFieldError>>;

export type CreatePatronResult =
  | { ok: true; id: number; barcode: string }
  | { ok: false; errors: PatronErrors };

export const EMPTY_PATRON: PatronInput = {
  email: "",
  lastName: "",
  firstName: "",
  barcode: "",
  login: "",
  gender: "",
  schoolClassId: "",
  categoryId: "",
  statusId: "",
  enrolledOn: "",
  expiresOn: "",
  notes: "",
};

// ---------------------------------------------------------------------------
// School year
// ---------------------------------------------------------------------------

/** French school year: it starts in September, so before then we are in N-1. */
export function currentSchoolYear(today = new Date()): {
  startsOn: Date;
  endsOn: Date;
  label: string;
} {
  const year = today.getMonth() >= 8 ? today.getFullYear() : today.getFullYear() - 1;
  return {
    startsOn: new Date(Date.UTC(year, 8, 1)),
    endsOn: new Date(Date.UTC(year + 1, 7, 31)),
    label: `${year}-${year + 1}`,
  };
}

/** `YYYY-MM-DD` for a date input, in UTC so the day never shifts. */
export function toDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseDate(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  // Accept both the HTML date input's YYYY-MM-DD and the DD/MM/YYYY a
  // librarian types into a spreadsheet.
  const french = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!french && !iso) return null;

  const [year, month, day] = french
    ? [Number(french[3]), Number(french[2]), Number(french[1])]
    : [Number(iso![1]), Number(iso![2]), Number(iso![3])];

  const date = new Date(Date.UTC(year, month - 1, day));
  // Rejects 31/02 and friends, which Date would silently roll forward.
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date;
}

// ---------------------------------------------------------------------------
// Barcodes
// ---------------------------------------------------------------------------

const BARCODE_PREFIX = "E";

/**
 * `E-2026-0001`, matching the seeded cards. Derives the next number from the
 * highest existing one for this school year rather than counting rows, so
 * deleting a reader never reissues their card number.
 */
export async function nextBarcode(schoolYearStart: number): Promise<string> {
  const prefix = `${BARCODE_PREFIX}-${schoolYearStart}-`;
  const last = await prisma.patron.findFirst({
    where: { barcode: { startsWith: prefix } },
    orderBy: { barcode: "desc" },
    select: { barcode: true },
  });
  const previous = last ? Number(last.barcode.slice(prefix.length)) : 0;
  const next = Number.isFinite(previous) ? previous + 1 : 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/** Deliberately loose: the point is to catch typos, not to police RFC 5322. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normaliseEmail(value: string): string {
  return value.trim().toLowerCase();
}

function optionalId(value: string): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

type Resolved = {
  email: string;
  lastName: string;
  firstName: string;
  login: string;
  gender: string | null;
  notes: string | null;
  schoolClassId: number | null;
  categoryId: number | null;
  statusId: number | null;
  enrolledOn: Date;
  expiresOn: Date;
};

/**
 * Everything that can be judged without touching the database. Uniqueness is
 * checked separately, because the import checks a whole file's worth at once.
 */
function validateShape(input: PatronInput): {
  errors: PatronErrors;
  resolved: Resolved | null;
} {
  const errors: PatronErrors = {};

  const email = normaliseEmail(input.email);
  if (!email) errors.email = "REQUIRED";
  else if (!EMAIL.test(email)) errors.email = "EMAIL_INVALID";

  const lastName = input.lastName.trim();
  const firstName = input.firstName.trim();
  if (!lastName) errors.lastName = "REQUIRED";
  if (!firstName) errors.firstName = "REQUIRED";

  const year = currentSchoolYear();
  const enrolledOn = input.enrolledOn.trim()
    ? parseDate(input.enrolledOn)
    : year.startsOn;
  const expiresOn = input.expiresOn.trim() ? parseDate(input.expiresOn) : year.endsOn;
  if (!enrolledOn) errors.enrolledOn = "DATE_INVALID";
  if (!expiresOn) errors.expiresOn = "DATE_INVALID";
  if (enrolledOn && expiresOn && expiresOn < enrolledOn) {
    errors.expiresOn = "DATE_ORDER";
  }

  if (Object.keys(errors).length > 0) return { errors, resolved: null };

  const gender = input.gender.trim().toUpperCase();

  return {
    errors,
    resolved: {
      email,
      lastName,
      firstName,
      // The email is the login unless the librarian overrode it.
      login: input.login.trim() || email,
      gender: gender === "F" || gender === "M" ? gender : null,
      notes: input.notes.trim() || null,
      schoolClassId: optionalId(input.schoolClassId),
      categoryId: optionalId(input.categoryId),
      statusId: optionalId(input.statusId),
      enrolledOn: enrolledOn!,
      expiresOn: expiresOn!,
    },
  };
}

// ---------------------------------------------------------------------------
// Creation
// ---------------------------------------------------------------------------

export async function createPatron(
  input: PatronInput,
): Promise<CreatePatronResult> {
  const { errors, resolved } = validateShape(input);
  if (!resolved) return { ok: false, errors };

  const taken = await findConflicts([
    { email: resolved.email, login: resolved.login, barcode: input.barcode.trim() },
  ]);
  const conflict = taken[0];
  if (conflict.email) errors.email = "EMAIL_TAKEN";
  if (conflict.login) errors.login = "LOGIN_TAKEN";
  if (conflict.barcode) errors.barcode = "BARCODE_TAKEN";
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const year = currentSchoolYear();
  const barcode =
    input.barcode.trim() || (await nextBarcode(year.startsOn.getUTCFullYear()));

  try {
    const created = await prisma.patron.create({
      data: {
        barcode,
        lastName: resolved.lastName,
        firstName: resolved.firstName,
        email: resolved.email,
        login: resolved.login,
        gender: resolved.gender,
        notes: resolved.notes,
        schoolClassId: resolved.schoolClassId,
        categoryId: resolved.categoryId,
        statusId: resolved.statusId,
        enrolledOn: resolved.enrolledOn,
        expiresOn: resolved.expiresOn,
        // No password: an imported or newly created reader can borrow at the
        // desk immediately, but cannot sign into the OPAC until one is set.
      },
    });
    return { ok: true, id: created.id, barcode: created.barcode };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      // Someone else took it between the check and the insert. The unique
      // indexes are the real guard; the check above only names the field.
      const target = String(error.meta?.target ?? "");
      return {
        ok: false,
        errors: target.includes("email")
          ? { email: "EMAIL_TAKEN" }
          : target.includes("login")
            ? { login: "LOGIN_TAKEN" }
            : { barcode: "BARCODE_TAKEN" },
      };
    }
    throw error;
  }
}

type Candidate = { email: string; login: string; barcode: string };

/** One query for a whole file, rather than three per row. */
async function findConflicts(
  candidates: Candidate[],
): Promise<{ email: boolean; login: boolean; barcode: boolean }[]> {
  const emails = candidates.map((c) => c.email).filter(Boolean);
  const logins = candidates.map((c) => c.login).filter(Boolean);
  const barcodes = candidates.map((c) => c.barcode).filter(Boolean);

  const existing = await prisma.patron.findMany({
    where: {
      OR: [
        { email: { in: emails } },
        { login: { in: logins } },
        { barcode: { in: barcodes } },
      ],
    },
    select: { email: true, login: true, barcode: true },
  });

  const takenEmails = new Set(existing.map((p) => p.email).filter(Boolean));
  const takenLogins = new Set(existing.map((p) => p.login).filter(Boolean));
  const takenBarcodes = new Set(existing.map((p) => p.barcode));

  return candidates.map((c) => ({
    email: Boolean(c.email) && takenEmails.has(c.email),
    login: Boolean(c.login) && takenLogins.has(c.login),
    barcode: Boolean(c.barcode) && takenBarcodes.has(c.barcode),
  }));
}

// ---------------------------------------------------------------------------
// Reference data
// ---------------------------------------------------------------------------

/**
 * `id` and `label` only. These feed `<select>`s in a Client Component, so a
 * whole row would ship the reader's category fee and the status permission
 * flags to the browser — and `membershipFee` is a `Decimal`, which React
 * refuses to serialise across the boundary.
 */
const OPTION = { id: true, label: true } as const;

export async function getPatronOptions() {
  const [schoolClasses, categories, statuses] = await Promise.all([
    prisma.schoolClass.findMany({ select: OPTION, orderBy: { label: "asc" } }),
    prisma.patronCategory.findMany({ select: OPTION, orderBy: { label: "asc" } }),
    prisma.patronStatus.findMany({ select: OPTION, orderBy: { label: "asc" } }),
  ]);
  return { schoolClasses, categories, statuses };
}
