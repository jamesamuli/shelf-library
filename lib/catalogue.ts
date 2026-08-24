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

export type Holding = {
  id: number;
  barcode: string;
  callNumber: string | null;
  location: string | null;
  section: string | null;
  status: string | null;
  /** False for reference copies — on the shelf, but not borrowable. */
  isLoanable: boolean;
  isOnLoan: boolean;
  /** ISO date string, or null when not on loan. */
  dueOn: string | null;
};

export type RecordDetail = {
  id: number;
  title: string;
  subtitle: string | null;
  abstract: string | null;
  publicationYear: number | null;
  standardNumber: string | null;
  documentType: string | null;
  collection: string | null;
  series: string | null;
  classification: string | null;
  authors: string[];
  publishers: string[];
  subjects: string[];
  holdings: Holding[];
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
 * Record-level OPAC visibility, mirroring legacy's
 * `notice_visible_opac` + `notice_visible_opac_abon`: the master switch must
 * be on, and a subscriber-only record additionally needs a signed-in patron.
 */
const visibleRecords = (isSubscriber: boolean) => Prisma.sql`
  JOIN record_statuses st
    ON st.id = r.status_id
   AND st.is_record_visible_in_opac
   AND (NOT st.is_record_subscriber_only OR ${isSubscriber})
`;

/**
 * Holdings visibility, applied on top of the record being visible at all:
 * the record's status must expose its items (`expl_visible_opac`, and
 * `expl_visible_opac_abon` for subscriber-only), and each item's own section
 * and status must be OPAC-visible. A null section/status counts as visible —
 * legacy's columns were NOT NULL with a 0 sentinel, ours are nullable.
 *
 * "Available" means no open loan, mirroring legacy's LEFT JOIN on `pret`.
 */
const visibleHoldings = (isSubscriber: boolean) => Prisma.sql`
  st.are_items_visible_in_opac
  AND (NOT st.are_items_subscriber_only OR ${isSubscriber})
  AND COALESCE(sec.is_visible_in_opac, true)
  AND COALESCE(ist.is_visible_in_opac, true)
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
  isSubscriber = false,
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
      ${visibleRecords(isSubscriber)}
      LEFT JOIN document_types dt ON dt.id = r.document_type_id
      LEFT JOIN LATERAL (
        SELECT
          count(*)::int AS total,
          -- A reference copy is on the shelf but cannot be borrowed, so it
          -- must not be counted as available.
          count(*) FILTER (
            WHERE l.id IS NULL AND COALESCE(ist.allows_loan, true)
          )::int AS available
        FROM items i
        LEFT JOIN sections sec ON sec.id = i.section_id
        LEFT JOIN item_statuses ist ON ist.id = i.status_id
        LEFT JOIN loans l ON l.item_id = i.id AND l.returned_at IS NULL
        WHERE i.record_id = r.id AND ${visibleHoldings(isSubscriber)}
      ) holdings ON true
      WHERE true ${match}
      ${order}
      LIMIT ${PER_PAGE} OFFSET ${offset}
    `,
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT count(*)::bigint AS count
      FROM bibliographic_records r
      ${visibleRecords(isSubscriber)}
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

type DetailRow = {
  id: number;
  title: string;
  subtitle: string | null;
  abstract: string | null;
  publication_year: number | null;
  standard_number: string | null;
  document_type: string | null;
  collection: string | null;
  series: string | null;
  classification: string | null;
  authors: string[] | null;
  publishers: string[] | null;
  subjects: string[] | null;
  holdings: Holding[] | null;
};

/**
 * Null when the record does not exist or its status hides it from this viewer.
 *
 * One round trip. Prisma's `include` issues a query per relation, which cost
 * ~1.6s against the remote database versus ~260ms for the single-query search;
 * the metadata and holdings are aggregated in SQL instead.
 *
 * Wrapped in React `cache` because both `generateMetadata` and the page body
 * need the record, and without it each detail view would fetch twice.
 */
export const getRecord = cache(async function getRecord(
  id: number,
  isSubscriber = false,
): Promise<RecordDetail | null> {
  const rows = await prisma.$queryRaw<DetailRow[]>`
    SELECT
      r.id,
      r.title,
      r.subtitle,
      r.abstract,
      r.publication_year,
      r.standard_number,
      dt.label AS document_type,
      col.name AS collection,
      ser.name AS series,
      ci.code AS classification,
      ARRAY(
        SELECT btrim(coalesce(a.forename, '') || ' ' || a.name)
        FROM contributions c
        JOIN authors a ON a.id = c.author_id
        WHERE c.record_id = r.id
        ORDER BY c.level, c.rank
      ) AS authors,
      ARRAY(
        SELECT p.name
        FROM record_publishers rp
        JOIN publishers p ON p.id = rp.publisher_id
        WHERE rp.record_id = r.id
        ORDER BY rp.rank
      ) AS publishers,
      ARRAY(
        SELECT sl.label
        FROM record_subjects rs
        JOIN subject_labels sl ON sl.subject_id = rs.subject_id
        WHERE rs.record_id = r.id
        ORDER BY rs.rank
      ) AS subjects,
      COALESCE((
        SELECT json_agg(h ORDER BY h.barcode)
        FROM (
          SELECT
            i.id,
            i.barcode,
            i.call_number   AS "callNumber",
            loc.label       AS location,
            sec.label       AS section,
            COALESCE(ist.opac_label, ist.label) AS status,
            COALESCE(ist.allows_loan, true) AS "isLoanable",
            (l.id IS NOT NULL) AS "isOnLoan",
            l.due_on        AS "dueOn"
          FROM items i
          LEFT JOIN locations loc ON loc.id = i.location_id
          LEFT JOIN sections sec ON sec.id = i.section_id
          LEFT JOIN item_statuses ist ON ist.id = i.status_id
          LEFT JOIN loans l ON l.item_id = i.id AND l.returned_at IS NULL
          WHERE i.record_id = r.id AND ${visibleHoldings(isSubscriber)}
        ) h
      ), '[]'::json) AS holdings
    FROM bibliographic_records r
    ${visibleRecords(isSubscriber)}
    LEFT JOIN document_types dt ON dt.id = r.document_type_id
    LEFT JOIN collections col ON col.id = r.collection_id
    LEFT JOIN series ser ON ser.id = r.series_id
    LEFT JOIN classification_indexes ci ON ci.id = r.classification_index_id
    WHERE r.id = ${id}
    LIMIT 1
  `;

  const row = rows[0];
  if (!row) return null;

  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    abstract: row.abstract,
    publicationYear: row.publication_year,
    standardNumber: row.standard_number,
    documentType: row.document_type,
    collection: row.collection,
    series: row.series,
    classification: row.classification,
    authors: row.authors ?? [],
    publishers: row.publishers ?? [],
    subjects: row.subjects ?? [],
    holdings: row.holdings ?? [],
  };
});
