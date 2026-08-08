import { cache } from "react";
import { Prisma } from "../generated/prisma/client";
import { prisma } from "./prisma";

/**
 * Public catalogue queries. See docs/10-catalogue.md for the legacy behaviour
 * these reproduce.
 *
 * SERVER ONLY.
 */

export const PER_PAGE = 10;

export type SearchHit = {
  id: number;
  title: string;
  subtitle: string | null;
  publicationYear: number | null;
  documentType: string | null;
  authors: string[];
  totalItems: number;
  availableItems: number;
};

export type SearchResults = {
  hits: SearchHit[];
  total: number;
  page: number;
  pageCount: number;
};

/**
 * Splits free user input into safe prefix-matched tsquery terms.
 *
 * Each term is reduced to letters/digits so nothing can inject tsquery
 * operators, then given `:*` — legacy's implicit right-truncation, which is
 * why its catalogue feels forgiving.
 */
export function parseTerms(input: string): string[] {
  return input
    .split(/[\s,;]+/)
    .map((term) => term.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter((term) => term.length > 0)
    .map((term) => `${term}:*`);
}

/**
 * Visibility, holdings and availability in one pass.
 *
 * - A record shows only when its status is OPAC-visible.
 * - An item counts only when its section and status are OPAC-visible; a null
 *   section/status is treated as visible (legacy required both, but its
 *   columns were NOT NULL with a 0 sentinel).
 * - "Available" means no open loan, mirroring legacy's LEFT JOIN on `pret`.
 */
const HOLDINGS_LATERAL = Prisma.sql`
  LEFT JOIN LATERAL (
    SELECT
      count(*)::int AS total,
      count(*) FILTER (WHERE l.id IS NULL)::int AS available
    FROM items i
    LEFT JOIN sections sec ON sec.id = i.section_id
    LEFT JOIN item_statuses ist ON ist.id = i.status_id
    LEFT JOIN loans l ON l.item_id = i.id AND l.returned_at IS NULL
    WHERE i.record_id = r.id
      AND COALESCE(sec.is_visible_in_opac, true)
      AND COALESCE(ist.is_visible_in_opac, true)
  ) holdings ON true
`;

const VISIBLE = Prisma.sql`
  JOIN record_statuses st ON st.id = r.status_id AND st.is_record_visible_in_opac
`;

type HitRow = {
  id: number;
  title: string;
  subtitle: string | null;
  publication_year: number | null;
  document_type: string | null;
  authors: string[] | null;
  total: number | null;
  available: number | null;
};

export async function searchCatalogue(
  rawQuery: string,
  page: number,
): Promise<SearchResults> {
  const terms = parseTerms(rawQuery);
  const currentPage = Math.max(1, page);
  const offset = (currentPage - 1) * PER_PAGE;

  /**
   * Every term must match SOMEWHERE on the record — its own text, one of its
   * authors, or one of its subjects — rather than all terms matching the same
   * field. Without this, "camus peste" finds nothing: "camus" lives only in
   * the author vector and "peste" only in the record vector, so no single
   * vector satisfies both. Author-plus-title is the most natural query a
   * reader makes, so it has to work.
   */
  const termMatch = (term: string) => Prisma.sql`(
    r.search_vector @@ to_tsquery('french_unaccent', ${term})
    OR EXISTS (
      SELECT 1 FROM contributions c
      JOIN authors a ON a.id = c.author_id
      WHERE c.record_id = r.id
        AND a.search_vector @@ to_tsquery('french_unaccent', ${term})
    )
    OR EXISTS (
      SELECT 1 FROM record_subjects rs
      JOIN subject_labels sl ON sl.subject_id = rs.subject_id
      WHERE rs.record_id = r.id
        AND sl.search_vector @@ to_tsquery('french_unaccent', ${term})
    )
  )`;

  const match = terms.length
    ? Prisma.sql`AND ${Prisma.join(terms.map(termMatch), " AND ")}`
    : Prisma.empty;

  // Relevance first, then title — legacy's `ORDER BY pert DESC, index_sew`.
  // Ranking uses the OR-form so a record matching more terms in its own text
  // outranks one that only matched via a linked heading.
  const rankQuery = terms.join(" | ");
  const order = terms.length
    ? Prisma.sql`ORDER BY ts_rank_cd(r.search_vector, to_tsquery('french_unaccent', ${rankQuery})) DESC, r.title ASC`
    : Prisma.sql`ORDER BY r.title ASC`;

  const [rows, countRows] = await Promise.all([
    prisma.$queryRaw<HitRow[]>`
      SELECT
        r.id,
        r.title,
        r.subtitle,
        r.publication_year,
        dt.label AS document_type,
        ARRAY(
          SELECT btrim(coalesce(a.forename, '') || ' ' || a.name)
          FROM contributions c
          JOIN authors a ON a.id = c.author_id
          WHERE c.record_id = r.id
          ORDER BY c.level, c.rank
        ) AS authors,
        holdings.total,
        holdings.available
      FROM bibliographic_records r
      ${VISIBLE}
      LEFT JOIN document_types dt ON dt.id = r.document_type_id
      ${HOLDINGS_LATERAL}
      WHERE true ${match}
      ${order}
      LIMIT ${PER_PAGE} OFFSET ${offset}
    `,
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT count(*)::bigint AS count
      FROM bibliographic_records r
      ${VISIBLE}
      WHERE true ${match}
    `,
  ]);

  const total = Number(countRows[0]?.count ?? 0);

  return {
    hits: rows.map((row) => ({
      id: row.id,
      title: row.title,
      subtitle: row.subtitle,
      publicationYear: row.publication_year,
      documentType: row.document_type,
      authors: row.authors ?? [],
      totalItems: row.total ?? 0,
      availableItems: row.available ?? 0,
    })),
    total,
    page: currentPage,
    pageCount: Math.max(1, Math.ceil(total / PER_PAGE)),
  };
}

export type RecordDetail = NonNullable<Awaited<ReturnType<typeof getRecord>>>;

/**
 * Null when the record does not exist or its status hides it from the OPAC.
 *
 * Wrapped in React `cache` because both `generateMetadata` and the page body
 * need the record — without it every detail view runs the whole query twice.
 */
export const getRecord = cache(async function getRecord(id: number) {
  const record = await prisma.bibliographicRecord.findFirst({
    where: { id, status: { isRecordVisibleInOpac: true } },
    include: {
      documentType: true,
      status: true,
      collection: true,
      series: true,
      classificationIndex: true,
      contributions: {
        include: { author: true },
        orderBy: [{ level: "asc" }, { rank: "asc" }],
      },
      recordPublishers: { include: { publisher: true } },
      recordSubjects: {
        include: { subject: { include: { labels: true } } },
      },
      // Each `include` is a separate round trip to a remote database, so only
      // relations the detail page actually renders belong here.
    },
  });

  if (!record) return null;

  // Holdings are only listed when the record's status allows it, then filtered
  // again by each item's own section and status visibility.
  const items = record.status?.areItemsVisibleInOpac
    ? await prisma.item.findMany({
        where: {
          recordId: id,
          AND: [
            { OR: [{ section: null }, { section: { isVisibleInOpac: true } }] },
            { OR: [{ status: null }, { status: { isVisibleInOpac: true } }] },
          ],
        },
        include: {
          location: true,
          section: true,
          status: true,
          loans: { where: { returnedAt: null }, take: 1 },
        },
        orderBy: { barcode: "asc" },
      })
    : [];

  return {
    ...record,
    holdings: items.map((item) => ({
      id: item.id,
      barcode: item.barcode,
      callNumber: item.callNumber,
      location: item.location?.label ?? null,
      section: item.section?.label ?? null,
      status: item.status?.opacLabel ?? item.status?.label ?? null,
      isOnLoan: item.loans.length > 0,
      dueOn: item.loans[0]?.dueOn ?? null,
    })),
  };
});
