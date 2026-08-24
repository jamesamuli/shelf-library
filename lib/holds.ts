import { Prisma } from "../generated/prisma/client";
import { prisma } from "./prisma";
import { checkOut } from "./circulation";

/**
 * Reservations, and the reshelving worklist that falls out of them.
 *
 * Legacy behaviour and what we changed: docs/14-reservations.md.
 *
 * SERVER ONLY.
 */

/** Days a copy is held on the shelf once it is set aside for a reader. */
export const PICKUP_DAYS = 7;

export type HoldState = "encours" | "depassee";

export type HoldRefusal =
  | "HOLD_NOT_FOUND"
  | "PATRON_NOT_FOUND"
  | "ITEM_NOT_FOUND"
  | "RECORD_NOT_FOUND"
  | "PATRON_NOT_ALLOWED"
  | "ALREADY_HELD"
  | "ITEM_ON_LOAN"
  | "ITEM_WRONG_TITLE"
  | "ITEM_ALREADY_SET_ASIDE"
  | "NO_COPY_ASSIGNED";

export type HoldResult =
  | { ok: true; detail?: string }
  | { ok: false; reason: HoldRefusal; detail?: string };

function today(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

/**
 * Everything the list needs, with every reference LEFT JOINed.
 *
 * This is the shape of legacy's `get_expl_info()` trap: it inner-joins a copy
 * against five reference tables, so one empty table makes the copy vanish and
 * the screen reports "Exemplaire inconnu" — blaming the barcode for a missing
 * location. Nothing here may drop a row because a lookup is absent.
 */
const holdShape = {
  include: {
    patron: { select: { id: true, barcode: true, lastName: true, firstName: true } },
    record: { select: { id: true, title: true } },
    issue: { select: { number: true, record: { select: { title: true } } } },
    item: {
      select: {
        id: true,
        barcode: true,
        callNumber: true,
        location: { select: { label: true } },
        section: { select: { label: true } },
        status: { select: { label: true } },
        loans: { where: { returnedAt: null }, select: { id: true }, take: 1 },
      },
    },
    pickupLocation: { select: { label: true } },
  },
} satisfies Prisma.HoldDefaultArgs;

type HoldRow = Prisma.HoldGetPayload<typeof holdShape>;

export type HoldView = {
  id: number;
  patronId: number;
  patronName: string;
  patronBarcode: string;
  title: string;
  recordId: number | null;
  placedAt: Date;
  expiresOn: Date | null;
  /** Null until a copy has been set aside. */
  itemBarcode: string | null;
  itemCallNumber: string | null;
  /** "—" rather than absent when the reference row is missing. */
  itemLocation: string;
  itemSection: string;
  itemStatus: string;
  itemIsOnLoan: boolean;
  pickupLocation: string | null;
};

function nameOf(patron: { lastName: string; firstName: string | null }) {
  return [patron.firstName, patron.lastName].filter(Boolean).join(" ");
}

function titleOf(row: HoldRow): string {
  if (row.record) return row.record.title;
  if (row.issue) return `${row.issue.record.title} — ${row.issue.number}`;
  return "—";
}

function toView(row: HoldRow): HoldView {
  return {
    id: row.id,
    patronId: row.patron.id,
    patronName: nameOf(row.patron),
    patronBarcode: row.patron.barcode,
    title: titleOf(row),
    recordId: row.record?.id ?? null,
    placedAt: row.placedAt,
    expiresOn: row.expiresOn,
    itemBarcode: row.item?.barcode ?? null,
    itemCallNumber: row.item?.callNumber ?? null,
    itemLocation: row.item?.location?.label ?? "—",
    itemSection: row.item?.section?.label ?? "—",
    itemStatus: row.item?.status?.label ?? "—",
    itemIsOnLoan: (row.item?.loans.length ?? 0) > 0,
    pickupLocation: row.pickupLocation?.label ?? null,
  };
}

/**
 * Legacy's split, verbatim (list_reservations_ui line 830):
 *   dépassée — resa_date_fin < CURDATE() and set
 *   en cours — resa_date_fin >= CURDATE() or unset
 * An unset end date means no copy has been assigned yet, so the reader is
 * still waiting rather than late to collect.
 */
export async function listHolds(state: HoldState): Promise<HoldView[]> {
  const now = today();
  const where: Prisma.HoldWhereInput =
    state === "depassee"
      ? { status: { in: ["PENDING", "AVAILABLE"] }, expiresOn: { lt: now } }
      : {
          status: { in: ["PENDING", "AVAILABLE"] },
          OR: [{ expiresOn: null }, { expiresOn: { gte: now } }],
        };

  const rows = await prisma.hold.findMany({
    where,
    ...holdShape,
    orderBy: { placedAt: "asc" },
  });
  return rows.map(toView);
}

export type ReshelvingView = {
  id: number;
  itemBarcode: string;
  title: string;
  callNumber: string | null;
  location: string;
  section: string;
  flaggedAt: Date;
};

export async function listReshelving(): Promise<ReshelvingView[]> {
  const rows = await prisma.reshelvingItem.findMany({
    include: {
      item: {
        select: {
          barcode: true,
          callNumber: true,
          record: { select: { title: true } },
          issue: { select: { number: true, record: { select: { title: true } } } },
          location: { select: { label: true } },
          section: { select: { label: true } },
        },
      },
    },
    orderBy: { flaggedAt: "asc" },
  });

  return rows.map((row) => ({
    id: row.id,
    itemBarcode: row.item.barcode,
    title:
      row.item.record?.title ??
      (row.item.issue
        ? `${row.item.issue.record.title} — ${row.item.issue.number}`
        : "—"),
    callNumber: row.item.callNumber,
    location: row.item.location?.label ?? "—",
    section: row.item.section?.label ?? "—",
    flaggedAt: row.flaggedAt,
  }));
}

export async function countHolds() {
  const now = today();
  const [current, outdated, reshelving] = await Promise.all([
    prisma.hold.count({
      where: {
        status: { in: ["PENDING", "AVAILABLE"] },
        OR: [{ expiresOn: null }, { expiresOn: { gte: now } }],
      },
    }),
    prisma.hold.count({
      where: { status: { in: ["PENDING", "AVAILABLE"] }, expiresOn: { lt: now } },
    }),
    prisma.reshelvingItem.count(),
  ]);
  return { current, outdated, reshelving };
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/**
 * Place a reservation. The reader's status must allow it — legacy's
 * `empr_statut.allow_book`, our `PatronStatus.allowsHold`.
 */
export async function placeHold(
  patronBarcode: string,
  itemBarcode: string,
): Promise<HoldResult> {
  const patron = await prisma.patron.findFirst({
    where: {
      barcode: { equals: patronBarcode.trim(), mode: "insensitive" },
      anonymizedAt: null,
    },
    include: { status: true },
  });
  if (!patron) return { ok: false, reason: "PATRON_NOT_FOUND" };
  if (patron.status && !patron.status.allowsHold) {
    return { ok: false, reason: "PATRON_NOT_ALLOWED" };
  }

  const item = await prisma.item.findFirst({
    where: { barcode: { equals: itemBarcode.trim(), mode: "insensitive" } },
    include: { record: { select: { id: true, title: true } } },
  });
  if (!item) return { ok: false, reason: "ITEM_NOT_FOUND", detail: itemBarcode };
  if (!item.recordId) return { ok: false, reason: "RECORD_NOT_FOUND" };

  // The hold is on the title, not the copy — legacy reserves a notice and
  // assigns a copy later. The barcode scanned here only identifies the title.
  const existing = await prisma.hold.findFirst({
    where: {
      patronId: patron.id,
      recordId: item.recordId,
      status: { in: ["PENDING", "AVAILABLE"] },
    },
  });
  if (existing) return { ok: false, reason: "ALREADY_HELD" };

  await prisma.hold.create({
    data: { patronId: patron.id, recordId: item.recordId },
  });
  return { ok: true, detail: item.record?.title };
}

/**
 * Set a copy aside for a waiting reader and start the pickup window. Legacy
 * wrote resa_cb + resa_date_debut/fin and flipped resa_confirmee.
 */
export async function assignCopy(
  holdId: number,
  itemBarcode: string,
): Promise<HoldResult> {
  const hold = await prisma.hold.findUnique({ where: { id: holdId } });
  if (!hold || hold.status === "FULFILLED" || hold.status === "CANCELLED") {
    return { ok: false, reason: "HOLD_NOT_FOUND" };
  }

  const item = await prisma.item.findFirst({
    where: { barcode: { equals: itemBarcode.trim(), mode: "insensitive" } },
    include: {
      loans: { where: { returnedAt: null }, take: 1 },
      // Any other reader already promised this copy.
      holds: {
        where: { id: { not: holdId }, status: { in: ["PENDING", "AVAILABLE"] } },
        select: { id: true },
        take: 1,
      },
    },
  });
  if (!item) return { ok: false, reason: "ITEM_NOT_FOUND", detail: itemBarcode };

  // The barcode is typed by hand at the desk, so it may be any copy in the
  // building. Setting aside a copy of some other title would satisfy nobody and
  // would then be lent out under this reservation.
  const matchesHold = hold.issueId
    ? item.issueId === hold.issueId
    : item.recordId === hold.recordId;
  if (!matchesHold) return { ok: false, reason: "ITEM_WRONG_TITLE", detail: item.barcode };

  if (item.loans.length > 0) return { ok: false, reason: "ITEM_ON_LOAN" };
  if (item.holds.length > 0) {
    return { ok: false, reason: "ITEM_ALREADY_SET_ASIDE", detail: item.barcode };
  }

  await prisma.hold.update({
    where: { id: holdId },
    data: {
      itemId: item.id,
      status: "AVAILABLE",
      expiresOn: addDays(today(), PICKUP_DAYS),
    },
  });
  // The copy is off the shelf on purpose now, so it is no longer a stray.
  await prisma.reshelvingItem.deleteMany({ where: { itemId: item.id } });
  return { ok: true, detail: item.barcode };
}

/**
 * Cancel a reservation. If a copy had been set aside it is added to the
 * reshelving worklist, which is exactly what legacy's `del_resa` did when it
 * could not reassign the barcode.
 */
export async function cancelHold(holdId: number): Promise<HoldResult> {
  const hold = await prisma.hold.findUnique({ where: { id: holdId } });
  if (!hold) return { ok: false, reason: "HOLD_NOT_FOUND" };

  await prisma.$transaction(async (tx) => {
    await tx.hold.update({
      where: { id: holdId },
      data: { status: "CANCELLED", resolvedAt: new Date(), itemId: null },
    });
    if (hold.itemId) {
      const stillWanted = await tx.hold.findFirst({
        where: {
          id: { not: holdId },
          recordId: hold.recordId,
          status: { in: ["PENDING", "AVAILABLE"] },
        },
      });
      // Only a copy nobody is waiting for needs putting back.
      if (!stillWanted) {
        await tx.reshelvingItem.upsert({
          where: { itemId: hold.itemId },
          update: {},
          create: { itemId: hold.itemId },
        });
      }
    }
  });

  return { ok: true };
}

/** Turn a reservation into a loan, reusing the desk's own check-out rules. */
export async function fulfilHold(holdId: number): Promise<HoldResult> {
  const hold = await prisma.hold.findUnique({
    where: { id: holdId },
    include: { item: { select: { barcode: true } } },
  });
  if (!hold || hold.status === "FULFILLED" || hold.status === "CANCELLED") {
    return { ok: false, reason: "HOLD_NOT_FOUND" };
  }
  if (!hold.item) return { ok: false, reason: "NO_COPY_ASSIGNED" };

  const loan = await checkOut(hold.patronId, hold.item.barcode);
  if (!loan.ok) {
    // Reuse the check-out refusal rather than inventing a parallel vocabulary.
    return { ok: false, reason: "ITEM_ON_LOAN", detail: loan.reason };
  }

  await prisma.hold.update({
    where: { id: holdId },
    data: { status: "FULFILLED", resolvedAt: new Date() },
  });
  return { ok: true, detail: loan.title };
}

/** Clear a reshelving entry by scanning the copy that has been put back. */
export async function clearReshelving(itemBarcode: string): Promise<HoldResult> {
  const item = await prisma.item.findFirst({
    where: { barcode: { equals: itemBarcode.trim(), mode: "insensitive" } },
    select: { id: true, barcode: true },
  });
  if (!item) return { ok: false, reason: "ITEM_NOT_FOUND", detail: itemBarcode };

  const removed = await prisma.reshelvingItem.deleteMany({
    where: { itemId: item.id },
  });
  if (removed.count === 0) {
    return { ok: false, reason: "ITEM_NOT_FOUND", detail: item.barcode };
  }
  return { ok: true, detail: item.barcode };
}

/** Copies of a held title that are on the shelf now — legacy liste_expl_dispo. */
export async function availableCopies(recordId: number) {
  const rows = await prisma.item.findMany({
    where: { recordId, loans: { none: { returnedAt: null } } },
    select: {
      id: true,
      barcode: true,
      callNumber: true,
      location: { select: { label: true } },
      section: { select: { label: true } },
      status: { select: { label: true, allowsLoan: true } },
    },
    orderBy: { barcode: "asc" },
  });

  return rows.map((row) => ({
    barcode: row.barcode,
    callNumber: row.callNumber,
    location: row.location?.label ?? "—",
    section: row.section?.label ?? "—",
    status: row.status?.label ?? "—",
    isLoanable: row.status?.allowsLoan ?? true,
  }));
}
