import { cache } from "react";
import { Prisma } from "../generated/prisma/client";
import { prisma } from "./prisma";
import type { Locale } from "./preferences";

/**
 * Public catalogue queries. See docs/10-catalogue.md for the legacy behaviour
 * these reproduce.
 *
 * SERVER ONLY.
 */

/** Twelve, as in the CDI's reference design (legacy: `opac_search_results_per_page`). */
export const PER_PAGE = 12;

export type SearchHit = {
  id: number;
  title: string;
  subtitle: string | null;
  publicationYear: number | null;
  documentType: string | null;
  authors: AuthorLink[];
  abstract: string | null;
  /** The English abstract, where one is written; see `abstractFor`. */
  abstractEn: string | null;
  totalItems: number;
  availableItems: number;
  coverUrl: string | null;
  standardNumber: string | null;
  /** ISO 639-2/B codes, e.g. "fre". */
  languages: string[];
  /** The record's first genre, for its ribbon. */
  genre: { labelFr: string; labelEn: string | null; icon: string; colour: string } | null;
  /** A copy to go and find: an available one when there is one. */
  callNumber: string | null;
  /** For the "Localiser" dialog, so it opens without a round trip. */
  holdings: Holding[];
  /** First publisher, and the collation (legacy notices.npages): the list view. */
  publisher: string | null;
  pageCount: string | null;
  likeCount: number;
  /** Whether the signed-in reader likes it; false when nobody is signed in. */
  liked: boolean;
};

export type AuthorLink = { id: number; name: string };
export type PublisherLink = { id: number; name: string };

export type PublisherDetail = {
  id: number;
  name: string;
  /** "Paris" or "Dakar, Sénégal". */
  place: string | null;
  /** The note the CDI writes (`publishers.comment`), shown as a description. */
  description: string | null;
  website: string | null;
};

export type AuthorDetail = {
  id: number;
  name: string;
  dates: string | null;
  /** Legacy `author_comment`: the note the CDI writes, shown as a biography. */
  biography: string | null;
  website: string | null;
};

export type DocumentTypeOption = { id: number; label: string };

/**
 * How many results each filter option would give, the other filters as they
 * are: document type ids, genre slugs and language codes to counts, and the
 * records with a copy on the shelf. An option missing from a map has none.
 */
export type Facets = {
  types: Record<string, number>;
  genres: Record<string, number>;
  languages: Record<string, number>;
  available: number;
};

export type SearchResults = {
  hits: SearchHit[];
  total: number;
  page: number;
  pageCount: number;
  /** Only when asked for (`withFacets`). */
  facets: Facets | null;
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
  /** ISO date string. */
  acquiredOn: string | null;
};

/**
 * The abstract in the reader's language: the English one in English where
 * the CDI has written it, the French one otherwise (CDI request).
 */
export function abstractFor(record: { abstract: string | null; abstractEn: string | null }, locale: Locale) {
  return (locale === "en" ? record.abstractEn : null) ?? record.abstract;
}

export type RecordDetail = {
  id: number;
  title: string;
  subtitle: string | null;
  abstract: string | null;
  abstractEn: string | null;
  publicationYear: number | null;
  standardNumber: string | null;
  documentType: string | null;
  collection: string | null;
  series: string | null;
  classification: string | null;
  /** The Dewey class's shelf label, e.g. "Théâtre français". */
  classificationLabel: string | null;
  authors: AuthorLink[];
  publishers: PublisherLink[];
  subjects: string[];
  genres: { slug: string; labelFr: string; labelEn: string | null; icon: string; colour: string }[];
  holdings: Holding[];
  coverUrl: string | null;
  /** Legacy notices.npages, e.g. "56 p." — the collation. */
  pageCount: string | null;
  physicalDetails: string | null;
  dimensions: string | null;
  edition: string | null;
  volume: string | null;
  /** ISO 639-2/B codes. */
  languages: string[];
  likeCount: number;
  liked: boolean;
};

export type Genre = {
  slug: string;
  label: string;
  icon: string;
  colour: string;
};

export type NewArrival = {
  id: number;
  title: string;
  authors: string[];
  documentType: string | null;
  /** The record's first genre, for its ribbon on the card. */
  genre: SearchHit["genre"];
  coverUrl: string | null;
  totalItems: number;
  availableItems: number;
};

/**
 * Legacy's rule: the record's own thumbnail, else a URL built from the
 * ISBN/EAN with dashes and dots stripped (`opac_book_pics_url`). The template
 * is Open Library's — free, keyless, and it answers a missing cover with a
 * blank image rather than an error, so the placeholder beneath shows through.
 */
export function coverUrl(
  thumbnailUrl: string | null,
  standardNumber: string | null,
): string | null {
  if (thumbnailUrl?.trim()) return thumbnailUrl.trim();
  const isbn = standardNumber?.replace(/[^0-9Xx]/g, "") ?? "";
  if (isbn.length !== 10 && isbn.length !== 13) return null;
  // L (~500 px wide) rather than M (~180): a phone shows one cover across
  // the screen, and the image optimiser cuts it down for smaller slots.
  return `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
}

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
  standard_number: string | null;
  thumbnail_url: string | null;
  abstract: string | null;
  abstract_en: string | null;
  document_type: string | null;
  authors: AuthorLink[];
  languages: string[] | null;
  genre: SearchHit["genre"];
  total: number | null;
  available: number | null;
  call_number: string | null;
  holdings: Holding[];
  like_count: number;
  liked: boolean;
  publisher: string | null;
  page_count: string | null;
};

/**
 * Shared holdings counts for result rows and new-arrival cards. A reference
 * copy is on the shelf but cannot be borrowed, so it must not be counted as
 * available.
 */
const holdingCounts = (isSubscriber: boolean) => Prisma.sql`
  LEFT JOIN LATERAL (
    SELECT
      count(*)::int AS total,
      count(*) FILTER (
        WHERE l.id IS NULL AND COALESCE(ist.allows_loan, true)
      )::int AS available,
      (array_agg(i.call_number ORDER BY (l.id IS NULL) DESC, i.barcode)
        FILTER (WHERE i.call_number IS NOT NULL))[1] AS call_number
    FROM items i
    LEFT JOIN sections sec ON sec.id = i.section_id
    LEFT JOIN item_statuses ist ON ist.id = i.status_id
    LEFT JOIN loans l ON l.item_id = i.id AND l.returned_at IS NULL
    WHERE i.record_id = r.id AND ${visibleHoldings(isSubscriber)}
  ) holdings ON true
`;

/**
 * The record's visible copies as JSON, one per line of the record page's
 * holdings table and of the results' "Localiser" dialog.
 */
const holdingList = (isSubscriber: boolean) => Prisma.sql`COALESCE((
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
      l.due_on        AS "dueOn",
      i.acquired_on   AS "acquiredOn"
    FROM items i
    LEFT JOIN locations loc ON loc.id = i.location_id
    LEFT JOIN sections sec ON sec.id = i.section_id
    LEFT JOIN item_statuses ist ON ist.id = i.status_id
    LEFT JOIN loans l ON l.item_id = i.id AND l.returned_at IS NULL
    WHERE i.record_id = r.id AND ${visibleHoldings(isSubscriber)}
  ) h
), '[]'::json)`;

/** Authors with their ids, for links to the author page. */
const authorLinks = Prisma.sql`
  COALESCE((
    SELECT json_agg(json_build_object(
      'id', a.id, 'name', btrim(coalesce(a.forename, '') || ' ' || a.name)
    ) ORDER BY c.level, c.rank)
    FROM contributions c
    JOIN authors a ON a.id = c.author_id
    WHERE c.record_id = r.id
  ), '[]'::json)
`;

const authorNames = Prisma.sql`
  ARRAY(
    SELECT btrim(coalesce(a.forename, '') || ' ' || a.name)
    FROM contributions c
    JOIN authors a ON a.id = c.author_id
    WHERE c.record_id = r.id
    ORDER BY c.level, c.rank
  )
`;

// Cached per request: the OPAC layout (the phone's bottom bar) and the home
// page both need the genres, and should share one query.
export const listGenres = cache(async (locale: Locale): Promise<Genre[]> => {
  const rows = await prisma.genre.findMany({ orderBy: [{ rank: "asc" }, { id: "asc" }] });
  return rows.map((row) => ({
    slug: row.slug,
    label: locale === "en" ? (row.labelEn ?? row.labelFr) : row.labelFr,
    icon: row.icon,
    colour: row.colour,
  }));
});

type ArrivalRow = {
  id: number;
  title: string;
  authors: string[] | null;
  document_type: string | null;
  genre: SearchHit["genre"];
  thumbnail_url: string | null;
  standard_number: string | null;
  total: number | null;
  available: number | null;
};

/**
 * Legacy's "dernières notices": most recently catalogued first, id as the
 * tie-break for records created in the same instant (bulk imports).
 */
export async function getNewArrivals(limit: number, isSubscriber = false): Promise<NewArrival[]> {
  // The newest ids are picked first, so the per-record holdings and author
  // subqueries run for `limit` rows rather than for the whole catalogue —
  // Postgres evaluates a LATERAL join for every row before the LIMIT.
  const rows = await prisma.$queryRaw<ArrivalRow[]>`
    SELECT
      r.id,
      r.title,
      ${authorNames} AS authors,
      dt.label AS document_type,
      (
        SELECT json_build_object(
          'labelFr', g.label_fr, 'labelEn', g.label_en, 'icon', g.icon, 'colour', g.colour
        )
        FROM record_genres rg
        JOIN genres g ON g.id = rg.genre_id
        WHERE rg.record_id = r.id
        ORDER BY g.rank
        LIMIT 1
      ) AS genre,
      r.thumbnail_url,
      r.standard_number,
      holdings.total,
      holdings.available
    FROM (
      SELECT r.id
      FROM bibliographic_records r
      ${visibleRecords(isSubscriber)}
      ORDER BY r.created_at DESC, r.id DESC
      LIMIT ${limit}
    ) newest
    JOIN bibliographic_records r ON r.id = newest.id
    ${visibleRecords(isSubscriber)}
    LEFT JOIN document_types dt ON dt.id = r.document_type_id
    ${holdingCounts(isSubscriber)}
    ORDER BY r.created_at DESC, r.id DESC
  `;

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    authors: row.authors ?? [],
    documentType: row.document_type,
    genre: row.genre,
    coverUrl: coverUrl(row.thumbnail_url, row.standard_number),
    totalItems: row.total ?? 0,
    availableItems: row.available ?? 0,
  }));
}

/**
 * Legacy let the OPAC sort a result set (`sort_by`) by relevance, title,
 * author or date. "Recent" is the order of the home's new arrivals, so its
 * "see more" tile can carry on where the row stops.
 */
export const SORTS = ["pertinence", "titre", "auteur", "recent", "annee"] as const;
export type Sort = (typeof SORTS)[number];

export function isSort(value: unknown): value is Sort {
  return SORTS.includes(value as Sort);
}

/**
 * The languages a reader can filter on (CDI decision: French, English and
 * Spanish, the ones the CDI collects). ISO 639-2/B, as `record_languages`.
 */
export const LANGUAGES = ["fre", "eng", "spa"] as const;
export type Language = (typeof LANGUAGES)[number];

export function isLanguage(value: unknown): value is Language {
  return LANGUAGES.includes(value as Language);
}

/**
 * The document types a reader can filter on: visible in the OPAC, and
 * holding at least one record, so no filter leads to an empty list by
 * construction. Cached per request, like the genres.
 */
export const listDocumentTypes = cache(async (): Promise<DocumentTypeOption[]> => {
  return prisma.$queryRaw<DocumentTypeOption[]>`
    SELECT dt.id, dt.label
    FROM document_types dt
    WHERE dt.is_visible_in_opac
      AND EXISTS (SELECT 1 FROM bibliographic_records r WHERE r.document_type_id = dt.id)
    ORDER BY dt.id
  `;
});

export async function searchCatalogue({
  query: rawQuery,
  page,
  isSubscriber = false,
  genre: genreSlug = null,
  documentTypeId = null,
  language = null,
  authorId = null,
  publisherId = null,
  patronId = null,
  availableOnly = false,
  cumulative = false,
  withFacets = false,
  sort,
}: {
  query: string;
  page: number;
  isSubscriber?: boolean;
  genre?: string | null;
  documentTypeId?: number | null;
  /** One of LANGUAGES: records written in it. */
  language?: Language | null;
  /** The author page's list: records this author contributed to. */
  authorId?: number | null;
  /** The publisher dialog's list: records this publisher published. */
  publisherId?: number | null;
  /** The signed-in reader, whose likes are marked on the hits. */
  patronId?: number | null;
  /** Only records with a copy on the shelf and loanable right now. */
  availableOnly?: boolean;
  /**
   * Pages 1 to `page` at once rather than `page` alone: the phone's "Voir
   * plus de livres", which grows the list instead of replacing it.
   */
  cumulative?: boolean;
  /** Also count what each filter option would give (the results page). */
  withFacets?: boolean;
  sort: Sort;
}): Promise<SearchResults> {
  const terms = parseTerms(rawQuery);
  const currentPage = Math.max(1, page);
  const offset = cumulative ? 0 : (currentPage - 1) * PER_PAGE;
  const limit = cumulative ? currentPage * PER_PAGE : PER_PAGE;

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

  // The four filters a reader picks, each a condition that is plain `true`
  // when not chosen, so the facet counts below can leave one out at a time.
  const inGenre = genreSlug
    ? Prisma.sql`EXISTS (
        SELECT 1 FROM record_genres rg
        JOIN genres g ON g.id = rg.genre_id
        WHERE rg.record_id = r.id AND g.slug = ${genreSlug}
      )`
    : Prisma.sql`true`;

  const inLanguage = language
    ? Prisma.sql`EXISTS (
        SELECT 1 FROM record_languages rl WHERE rl.record_id = r.id AND rl.language_code = ${language}
      )`
    : Prisma.sql`true`;

  const ofType = documentTypeId ? Prisma.sql`r.document_type_id = ${documentTypeId}` : Prisma.sql`true`;

  // A copy on the shelf, loanable, and shown in the OPAC: the same test as
  // `holdingCounts`' "available".
  const onShelf = Prisma.sql`EXISTS (
    SELECT 1 FROM items i
    LEFT JOIN sections sec ON sec.id = i.section_id
    LEFT JOIN item_statuses ist ON ist.id = i.status_id
    WHERE i.record_id = r.id
      AND ${visibleHoldings(isSubscriber)}
      AND COALESCE(ist.allows_loan, true)
      AND NOT EXISTS (SELECT 1 FROM loans l WHERE l.item_id = i.id AND l.returned_at IS NULL)
  )`;
  const isAvailable = availableOnly ? onShelf : Prisma.sql`true`;

  // Accents folded and case ignored, so "Éthiopiques" files under E and
  // "L’Étranger" beside "Le…", not after Z. The title is every sort's
  // tie-break, as legacy's `index_sew` was.
  const byTitle = Prisma.sql`unaccent(lower(r.title)) ASC, r.id ASC`;
  const firstAuthor = Prisma.sql`(
    SELECT unaccent(lower(a.name))
    FROM contributions c
    JOIN authors a ON a.id = c.author_id
    WHERE c.record_id = r.id
    ORDER BY c.level, c.rank
    LIMIT 1
  )`;
  // Relevance first, then title — legacy's `ORDER BY pert DESC, index_sew`.
  // Ranking uses the OR-form so a record matching more terms in its own text
  // outranks one that only matched via a linked heading. Without terms there
  // is nothing to rank, so relevance falls back to title.
  const rankQuery = terms.join(" | ");
  const order = {
    pertinence: terms.length
      ? Prisma.sql`ts_rank_cd(r.search_vector, to_tsquery('french_unaccent', ${rankQuery})) DESC, ${byTitle}`
      : byTitle,
    titre: byTitle,
    auteur: Prisma.sql`${firstAuthor} ASC NULLS LAST, ${byTitle}`,
    recent: Prisma.sql`r.created_at DESC, r.id DESC`,
    annee: Prisma.sql`r.publication_year DESC NULLS LAST, ${byTitle}`,
  }[sort];

  const byAuthor = authorId
    ? Prisma.sql`AND EXISTS (
        SELECT 1 FROM contributions c WHERE c.record_id = r.id AND c.author_id = ${authorId}
      )`
    : Prisma.empty;

  const byPublisher = publisherId
    ? Prisma.sql`AND EXISTS (
        SELECT 1 FROM record_publishers rp WHERE rp.record_id = r.id AND rp.publisher_id = ${publisherId}
      )`
    : Prisma.empty;

  const filters = Prisma.sql`
    WHERE ${inGenre} AND ${ofType} AND ${inLanguage} AND ${isAvailable}
    ${match} ${byAuthor} ${byPublisher}
  `;

  // The page's ids are picked first, so the per-record lookups below run for
  // one page rather than for every match — as for the new arrivals.
  const [rows, countRows, facetRows] = await Promise.all([
    prisma.$queryRaw<HitRow[]>`
      SELECT
        r.id,
        r.title,
        r.subtitle,
        r.publication_year,
        r.standard_number,
        r.thumbnail_url,
        r.abstract,
        r.abstract_en,
        r.page_count,
        dt.label AS document_type,
        ${authorLinks} AS authors,
        (
          SELECT p.name FROM record_publishers rp
          JOIN publishers p ON p.id = rp.publisher_id
          WHERE rp.record_id = r.id
          ORDER BY rp.rank
          LIMIT 1
        ) AS publisher,
        ARRAY(
          SELECT rl.language_code
          FROM record_languages rl
          WHERE rl.record_id = r.id
          ORDER BY rl.rank
        ) AS languages,
        (
          SELECT json_build_object(
            'labelFr', g.label_fr, 'labelEn', g.label_en, 'icon', g.icon, 'colour', g.colour
          )
          FROM record_genres rg
          JOIN genres g ON g.id = rg.genre_id
          WHERE rg.record_id = r.id
          ORDER BY g.rank
          LIMIT 1
        ) AS genre,
        holdings.total,
        holdings.available,
        holdings.call_number,
        ${holdingList(isSubscriber)} AS holdings,
        (SELECT count(*)::int FROM record_likes lk WHERE lk.record_id = r.id) AS like_count,
        EXISTS (
          SELECT 1 FROM record_likes lk WHERE lk.record_id = r.id AND lk.patron_id = ${patronId ?? 0}
        ) AS liked
      FROM (
        SELECT r.id, row_number() OVER (ORDER BY ${order}) AS position
        FROM bibliographic_records r
        ${visibleRecords(isSubscriber)}
        ${filters}
        ORDER BY position
        LIMIT ${limit} OFFSET ${offset}
      ) page
      JOIN bibliographic_records r ON r.id = page.id
      ${visibleRecords(isSubscriber)}
      LEFT JOIN document_types dt ON dt.id = r.document_type_id
      ${holdingCounts(isSubscriber)}
      ORDER BY page.position
    `,
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT count(*)::bigint AS count
      FROM bibliographic_records r
      ${visibleRecords(isSubscriber)}
      ${filters}
    `,
    // What each option of each filter would give with the others as they
    // are (CDI request: "Romans · 18", empty ones dimmed). One query, so one
    // more database operation per results page: each matching record is
    // flagged once for every filter, then counted per facet leaving that
    // facet's own filter out.
    withFacets
      ? prisma.$queryRaw<{ facet: string; key: string; count: number }[]>`
          WITH m AS (
            SELECT
              r.id,
              r.document_type_id,
              ${inGenre} AS in_genre,
              ${ofType} AS of_type,
              ${inLanguage} AS in_language,
              ${onShelf} AS on_shelf
            FROM bibliographic_records r
            ${visibleRecords(isSubscriber)}
            WHERE true ${match} ${byAuthor} ${byPublisher}
          ),
          f AS (
            SELECT *, (on_shelf OR NOT ${availableOnly}) AS available_ok FROM m
          )
          SELECT 'type' AS facet, document_type_id::text AS key, count(*)::int AS count
          FROM f WHERE in_genre AND in_language AND available_ok AND document_type_id IS NOT NULL
          GROUP BY document_type_id
          UNION ALL
          SELECT 'genre', g.slug, count(DISTINCT f.id)::int
          FROM f
          JOIN record_genres rg ON rg.record_id = f.id
          JOIN genres g ON g.id = rg.genre_id
          WHERE of_type AND in_language AND available_ok
          GROUP BY g.slug
          UNION ALL
          SELECT 'language', rl.language_code, count(DISTINCT f.id)::int
          FROM f
          JOIN record_languages rl ON rl.record_id = f.id
          WHERE of_type AND in_genre AND available_ok
          GROUP BY rl.language_code
          UNION ALL
          SELECT 'available', 'on_shelf', count(*)::int
          FROM f WHERE of_type AND in_genre AND in_language AND on_shelf
        `
      : Promise.resolve(null),
  ]);

  const facets: Facets | null = facetRows
    ? { types: {}, genres: {}, languages: {}, available: 0 }
    : null;
  for (const row of facetRows ?? []) {
    if (!facets) break;
    if (row.facet === "type") facets.types[row.key] = row.count;
    else if (row.facet === "genre") facets.genres[row.key] = row.count;
    else if (row.facet === "language") facets.languages[row.key] = row.count;
    else facets.available = row.count;
  }

  const total = Number(countRows[0]?.count ?? 0);

  return {
    hits: rows.map((row) => ({
      id: row.id,
      title: row.title,
      subtitle: row.subtitle,
      publicationYear: row.publication_year,
      documentType: row.document_type,
      authors: row.authors,
      abstract: row.abstract,
      abstractEn: row.abstract_en,
      totalItems: row.total ?? 0,
      availableItems: row.available ?? 0,
      coverUrl: coverUrl(row.thumbnail_url, row.standard_number),
      standardNumber: row.standard_number,
      languages: row.languages ?? [],
      genre: row.genre,
      callNumber: row.call_number,
      holdings: row.holdings,
      likeCount: row.like_count,
      liked: row.liked,
      publisher: row.publisher,
      pageCount: row.page_count,
    })),
    total,
    page: currentPage,
    pageCount: Math.max(1, Math.ceil(total / PER_PAGE)),
    facets,
  };
}

type DetailRow = {
  id: number;
  title: string;
  subtitle: string | null;
  abstract: string | null;
  abstract_en: string | null;
  publication_year: number | null;
  standard_number: string | null;
  document_type: string | null;
  collection: string | null;
  series: string | null;
  classification: string | null;
  classification_label: string | null;
  authors: AuthorLink[];
  publishers: PublisherLink[] | null;
  subjects: string[] | null;
  genres: RecordDetail["genres"] | null;
  holdings: Holding[] | null;
  thumbnail_url: string | null;
  page_count: string | null;
  physical_details: string | null;
  dimensions: string | null;
  edition_statement: string | null;
  volume_number: string | null;
  languages: string[] | null;
  like_count: number;
  liked: boolean;
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
  /** The signed-in reader, whose like is marked. */
  patronId: number | null = null,
): Promise<RecordDetail | null> {
  const rows = await prisma.$queryRaw<DetailRow[]>`
    SELECT
      r.id,
      r.title,
      r.subtitle,
      r.abstract,
      r.abstract_en,
      r.publication_year,
      r.standard_number,
      dt.label AS document_type,
      col.name AS collection,
      ser.name AS series,
      ci.code AS classification,
      ci.comment AS classification_label,
      r.thumbnail_url,
      r.page_count,
      r.physical_details,
      r.dimensions,
      r.edition_statement,
      r.volume_number,
      ARRAY(
        SELECT rl.language_code FROM record_languages rl WHERE rl.record_id = r.id ORDER BY rl.rank
      ) AS languages,
      (SELECT count(*)::int FROM record_likes lk WHERE lk.record_id = r.id) AS like_count,
      EXISTS (
        SELECT 1 FROM record_likes lk WHERE lk.record_id = r.id AND lk.patron_id = ${patronId ?? 0}
      ) AS liked,
      ${authorLinks} AS authors,
      (
        SELECT json_agg(json_build_object('id', p.id, 'name', p.name) ORDER BY rp.rank)
        FROM record_publishers rp
        JOIN publishers p ON p.id = rp.publisher_id
        WHERE rp.record_id = r.id
      ) AS publishers,
      ARRAY(
        SELECT sl.label
        FROM record_subjects rs
        JOIN subject_labels sl ON sl.subject_id = rs.subject_id
        WHERE rs.record_id = r.id
        ORDER BY rs.rank
      ) AS subjects,
      (
        SELECT json_agg(json_build_object(
          'slug', g.slug, 'labelFr', g.label_fr, 'labelEn', g.label_en,
          'icon', g.icon, 'colour', g.colour
        ) ORDER BY g.rank)
        FROM record_genres rg
        JOIN genres g ON g.id = rg.genre_id
        WHERE rg.record_id = r.id
      ) AS genres,
      ${holdingList(isSubscriber)} AS holdings
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
    abstractEn: row.abstract_en,
    publicationYear: row.publication_year,
    standardNumber: row.standard_number,
    documentType: row.document_type,
    collection: row.collection,
    series: row.series,
    classification: row.classification,
    classificationLabel: row.classification_label,
    authors: row.authors ?? [],
    publishers: row.publishers ?? [],
    subjects: row.subjects ?? [],
    genres: row.genres ?? [],
    holdings: row.holdings ?? [],
    coverUrl: coverUrl(row.thumbnail_url, row.standard_number),
    pageCount: row.page_count,
    physicalDetails: row.physical_details,
    dimensions: row.dimensions,
    edition: row.edition_statement,
    volume: row.volume_number,
    languages: row.languages ?? [],
    likeCount: row.like_count,
    liked: row.liked,
  };
});

/** The author page's header. Null for an unknown id. */
export const getAuthor = cache(async (id: number): Promise<AuthorDetail | null> => {
  const author = await prisma.author.findUnique({ where: { id } });
  if (!author) return null;
  return {
    id: author.id,
    name: [author.forename, author.name].filter(Boolean).join(" "),
    dates: author.dates,
    biography: author.comment,
    website: author.website,
  };
});

/** The publisher dialog's header. Null for an unknown id. */
export const getPublisher = cache(async (id: number): Promise<PublisherDetail | null> => {
  const publisher = await prisma.publisher.findUnique({ where: { id } });
  if (!publisher) return null;
  return {
    id: publisher.id,
    name: publisher.name,
    place: [publisher.city, publisher.country].filter(Boolean).join(", ") || null,
    description: publisher.comment,
    website: publisher.website,
  };
});
