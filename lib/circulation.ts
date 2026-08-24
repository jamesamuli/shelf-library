import { Prisma } from "../generated/prisma/client";
import { prisma } from "./prisma";

/**
 * Circulation: check-out, check-in, renewal.
 *
 * The refusal rules and how they differ from legacy PMB are set out in
 * docs/11-circulation.md. Refusals are returned as codes, not sentences —
 * the UI is bilingual and owns the wording.
 *
 * SERVER ONLY.
 */

/** Used when the patron's category does not set one. */
export const DEFAULT_LOAN_DAYS = 14;
export const MAX_RENEWALS = 2;

export type CheckOutRefusal =
  | "PATRON_NOT_FOUND"
  | "ITEM_NOT_FOUND"
  | "PATRON_EXPIRED"
  | "PATRON_BLOCKED"
  | "PATRON_NOT_ALLOWED"
  | "ITEM_NOT_LOANABLE"
  | "ALREADY_ON_LOAN_HERE"
  | "ALREADY_ON_LOAN_ELSEWHERE"
  | "QUOTA_REACHED";

/** Refusals a librarian may override; the rest are hard stops. */
const OVERRIDABLE: ReadonlySet<CheckOutRefusal> = new Set([
  "ITEM_NOT_LOANABLE",
  "QUOTA_REACHED",
]);

export type CheckOutResult =
  | { ok: true; title: string; barcode: string; dueOn: Date }
  | { ok: false; reason: CheckOutRefusal; overridable: boolean; detail?: string };

export type CheckInResult =
  | {
      ok: true;
      title: string;
      barcode: string;
      patronName: string;
      daysLate: number;
    }
  | { ok: false; reason: "ITEM_NOT_FOUND" | "NOT_ON_LOAN"; detail?: string };

export type RenewRefusal =
  | "LOAN_NOT_FOUND"
  | "PATRON_NOT_ALLOWED"
  | "LIMIT_REACHED"
  | "NO_LATER_DATE";

export type RenewResult =
  | { ok: true; title: string; dueOn: Date }
  | { ok: false; reason: RenewRefusal; overridable: boolean };

/**
 * Midnight today, as a date-only value.
 *
 * `due_on` is a Postgres DATE. Building it from a local-time Date would shift
 * the day either side of UTC, so the calendar day is read locally and pinned
 * to UTC midnight.
 */
function today(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

/** Whole days between two date-only values; negative when `to` is earlier. */
export function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

const patronForDesk = {
  include: { status: true, category: true },
} satisfies Prisma.PatronDefaultArgs;

type PatronForDesk = Prisma.PatronGetPayload<typeof patronForDesk>;

/** The title of whatever an item hangs off — a record, or a serial issue. */
const itemTitle = {
  include: {
    status: true,
    record: { select: { title: true } },
    issue: { select: { number: true, record: { select: { title: true } } } },
  },
} satisfies Prisma.ItemDefaultArgs;

type ItemForDesk = Prisma.ItemGetPayload<typeof itemTitle>;

function titleOf(item: ItemForDesk): string {
  if (item.record) return item.record.title;
  if (item.issue) return `${item.issue.record.title} — ${item.issue.number}`;
  return item.barcode;
}

function patronName(patron: { lastName: string; firstName: string | null }) {
  return [patron.firstName, patron.lastName].filter(Boolean).join(" ");
}

/**
 * Due date = today + the patron category's duration, capped at the end of
 * membership (legacy's `pmb_pret_date_retour_adhesion_depassee = 0` branch:
 * a loan may not outlive the card).
 */
function dueDateFor(patron: PatronForDesk, from: Date, days: number): Date {
  const due = addDays(from, days);
  if (patron.expiresOn && patron.expiresOn < due) return patron.expiresOn;
  return due;
}

function loanDaysFor(patron: PatronForDesk): number {
  return patron.category?.loanDurationDays ?? DEFAULT_LOAN_DAYS;
}

export async function findPatron(barcode: string): Promise<PatronForDesk | null> {
  const trimmed = barcode.trim();
  if (!trimmed) return null;
  return prisma.patron.findFirst({
    where: { barcode: { equals: trimmed, mode: "insensitive" }, anonymizedAt: null },
    ...patronForDesk,
  });
}

export type PatronSummary = {
  id: number;
  barcode: string;
  name: string;
  category: string | null;
  status: string | null;
  expiresOn: Date | null;
  blockedUntil: Date | null;
  activeLoans: number;
  overdueLoans: number;
  quota: number | null;
};

export type LoanRow = {
  id: number;
  itemBarcode: string;
  title: string;
  recordId: number | null;
  loanedAt: Date;
  dueOn: Date;
  returnedAt: Date | null;
  renewalCount: number;
  daysLate: number;
};

type LoanWithItem = Prisma.LoanGetPayload<{ include: { item: typeof itemTitle } }>;

function toLoanRow(loan: LoanWithItem, reference: Date): LoanRow {
  const daysLate = loan.returnedAt ? 0 : Math.max(0, daysBetween(loan.dueOn, reference));
  return {
    id: loan.id,
    itemBarcode: loan.item.barcode,
    title: titleOf(loan.item),
    recordId: loan.item.recordId,
    loanedAt: loan.loanedAt,
    dueOn: loan.dueOn,
    returnedAt: loan.returnedAt,
    renewalCount: loan.renewalCount,
    daysLate,
  };
}

export async function getPatronDesk(patronId: number): Promise<{
  patron: PatronSummary;
  loans: LoanRow[];
} | null> {
  const patron = await prisma.patron.findUnique({
    where: { id: patronId },
    ...patronForDesk,
  });
  if (!patron) return null;

  const loans = await prisma.loan.findMany({
    where: { patronId, returnedAt: null },
    include: { item: itemTitle },
    orderBy: { dueOn: "asc" },
  });

  const now = today();
  const rows = loans.map((loan) => toLoanRow(loan, now));

  return {
    patron: {
      id: patron.id,
      barcode: patron.barcode,
      name: patronName(patron),
      category: patron.category?.label ?? null,
      status: patron.status?.label ?? null,
      expiresOn: patron.expiresOn,
      blockedUntil: patron.blockedUntil,
      activeLoans: rows.length,
      overdueLoans: rows.filter((row) => row.daysLate > 0).length,
      quota: patron.category?.loanQuota ?? null,
    },
    loans: rows,
  };
}

/** Current loans and history for the signed-in patron's own account. */
export async function getPatronAccount(patronId: number): Promise<{
  current: LoanRow[];
  history: LoanRow[];
  canRenew: boolean;
}> {
  /**
   * Two queries, not one sorted list. Postgres sorts NULLs last on ASC, so
   * ordering everything by `returned_at` put the open loans — the ones the
   * patron actually came to see — after the returned ones, where a `take`
   * limit would eventually cut them off entirely.
   */
  const [patron, open, returned] = await Promise.all([
    prisma.patron.findUnique({ where: { id: patronId }, ...patronForDesk }),
    prisma.loan.findMany({
      where: { patronId, returnedAt: null },
      include: { item: itemTitle },
      orderBy: { dueOn: "asc" },
    }),
    prisma.loan.findMany({
      where: { patronId, returnedAt: { not: null } },
      include: { item: itemTitle },
      orderBy: { returnedAt: "desc" },
      take: 50,
    }),
  ]);

  const now = today();

  return {
    current: open.map((loan) => toLoanRow(loan, now)),
    history: returned.map((loan) => toLoanRow(loan, now)),
    canRenew: patron?.status?.allowsRenewal ?? true,
  };
}

function refuse(reason: CheckOutRefusal, detail?: string): CheckOutResult {
  return { ok: false, reason, overridable: OVERRIDABLE.has(reason), detail };
}

/**
 * The refusal chain, in the order legacy runs it: identity first, then
 * patron policy, then item policy, then quota. `force` skips only the
 * refusals marked overridable.
 */
export async function checkOut(
  patronId: number,
  itemBarcode: string,
  options: { force?: boolean } = {},
): Promise<CheckOutResult> {
  const barcode = itemBarcode.trim();
  if (!barcode) return refuse("ITEM_NOT_FOUND");

  const [patron, item] = await Promise.all([
    prisma.patron.findUnique({ where: { id: patronId }, ...patronForDesk }),
    prisma.item.findFirst({
      where: { barcode: { equals: barcode, mode: "insensitive" } },
      ...itemTitle,
    }),
  ]);

  if (!patron || patron.anonymizedAt) return refuse("PATRON_NOT_FOUND");
  if (!item) return refuse("ITEM_NOT_FOUND", barcode);

  const now = today();
  if (patron.expiresOn && patron.expiresOn < now) return refuse("PATRON_EXPIRED");
  if (patron.blockedUntil && patron.blockedUntil >= now) return refuse("PATRON_BLOCKED");
  if (patron.status && !patron.status.allowsLoan) return refuse("PATRON_NOT_ALLOWED");

  const openLoan = await prisma.loan.findFirst({
    where: { itemId: item.id, returnedAt: null },
    include: { patron: { select: { lastName: true, firstName: true } } },
  });
  if (openLoan) {
    return openLoan.patronId === patron.id
      ? refuse("ALREADY_ON_LOAN_HERE")
      : refuse("ALREADY_ON_LOAN_ELSEWHERE", patronName(openLoan.patron));
  }

  if (!options.force) {
    if (item.status && !item.status.allowsLoan) {
      return refuse("ITEM_NOT_LOANABLE", item.status.label);
    }
    const quota = patron.category?.loanQuota;
    if (quota !== null && quota !== undefined) {
      const active = await prisma.loan.count({
        where: { patronId: patron.id, returnedAt: null },
      });
      if (active >= quota) return refuse("QUOTA_REACHED", String(quota));
    }
  }

  const dueOn = dueDateFor(patron, now, loanDaysFor(patron));

  try {
    await prisma.$transaction([
      prisma.loan.create({ data: { itemId: item.id, patronId: patron.id, dueOn } }),
      prisma.item.update({
        where: { id: item.id },
        data: { lastLoanAt: new Date() },
      }),
    ]);
  } catch (error) {
    // one_active_loan_per_item — another desk lent this copy between our
    // check above and the insert. The index is the real guard; the check
    // above only exists to name the borrower.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return refuse("ALREADY_ON_LOAN_ELSEWHERE");
    }
    throw error;
  }

  return { ok: true, title: titleOf(item), barcode: item.barcode, dueOn };
}

export async function checkIn(itemBarcode: string): Promise<CheckInResult> {
  const barcode = itemBarcode.trim();
  if (!barcode) return { ok: false, reason: "ITEM_NOT_FOUND" };

  const item = await prisma.item.findFirst({
    where: { barcode: { equals: barcode, mode: "insensitive" } },
    ...itemTitle,
  });
  if (!item) return { ok: false, reason: "ITEM_NOT_FOUND", detail: barcode };

  const loan = await prisma.loan.findFirst({
    where: { itemId: item.id, returnedAt: null },
    include: { patron: { select: { lastName: true, firstName: true } } },
  });
  if (!loan) {
    return { ok: false, reason: "NOT_ON_LOAN", detail: titleOf(item) };
  }

  await prisma.loan.update({
    where: { id: loan.id },
    data: { returnedAt: new Date() },
  });

  return {
    ok: true,
    title: titleOf(item),
    barcode: item.barcode,
    patronName: patronName(loan.patron),
    daysLate: Math.max(0, daysBetween(loan.dueOn, today())),
  };
}

/**
 * Renewal extends from the current due date, not from today, so renewing
 * early never shortens a loan. Only staff may pass `force`, and it waives
 * the renewal limit alone.
 */
export async function renewLoan(
  loanId: number,
  options: {
    asStaff?: boolean;
    force?: boolean;
    /**
     * Set from the OPAC session. Without it a patron could renew any loan by
     * guessing an id — the loan id is the only thing the form carries.
     */
    ownedBy?: number;
  } = {},
): Promise<RenewResult> {
  const loan = await prisma.loan.findFirst({
    where: {
      id: loanId,
      returnedAt: null,
      ...(options.ownedBy === undefined ? {} : { patronId: options.ownedBy }),
    },
    include: { item: itemTitle, patron: patronForDesk },
  });
  if (!loan) return { ok: false, reason: "LOAN_NOT_FOUND", overridable: false };

  const { patron } = loan;
  if (!options.asStaff && patron.status && !patron.status.allowsRenewal) {
    return { ok: false, reason: "PATRON_NOT_ALLOWED", overridable: false };
  }

  // Only staff may waive the limit — `force` alone is not authority.
  if (loan.renewalCount >= MAX_RENEWALS && !(options.force && options.asStaff)) {
    return {
      ok: false,
      reason: "LIMIT_REACHED",
      overridable: Boolean(options.asStaff),
    };
  }

  /**
   * From the due date, so renewing early never shortens a loan — but never
   * from before today, or renewing an overdue loan would hand back a due
   * date still in the past and leave the reader just as late as before.
   */
  const from = loan.dueOn > today() ? loan.dueOn : today();
  const dueOn = dueDateFor(patron, from, loanDaysFor(patron));
  if (dueOn <= loan.dueOn) {
    // Capped by the membership end date — extending would change nothing.
    return { ok: false, reason: "NO_LATER_DATE", overridable: false };
  }

  await prisma.loan.update({
    where: { id: loan.id },
    data: { dueOn, renewalCount: { increment: 1 }, noticeLevel: 0 },
  });

  return { ok: true, title: titleOf(loan.item), dueOn };
}

/** Dashboard counters. One round trip. */
export async function getCirculationOverview() {
  const now = today();
  const [records, items, patrons, activeLoans, overdueLoans, recent] =
    await Promise.all([
      prisma.bibliographicRecord.count(),
      prisma.item.count(),
      prisma.patron.count({ where: { anonymizedAt: null } }),
      prisma.loan.count({ where: { returnedAt: null } }),
      prisma.loan.count({ where: { returnedAt: null, dueOn: { lt: now } } }),
      prisma.loan.findMany({
        where: { returnedAt: null },
        include: {
          item: itemTitle,
          patron: { select: { lastName: true, firstName: true, barcode: true } },
        },
        orderBy: { loanedAt: "desc" },
        take: 6,
      }),
    ]);

  return {
    records,
    items,
    patrons,
    activeLoans,
    overdueLoans,
    recent: recent.map((loan) => ({
      id: loan.id,
      title: titleOf(loan.item),
      patron: patronName(loan.patron),
      patronBarcode: loan.patron.barcode,
      loanedAt: loan.loanedAt,
      dueOn: loan.dueOn,
      daysLate: Math.max(0, daysBetween(loan.dueOn, now)),
    })),
  };
}
