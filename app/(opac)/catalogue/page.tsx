import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ChevronDown, LayoutList, List, SlidersHorizontal, X } from "lucide-react";
import { fill, messagesFor } from "@/lib/i18n";
import { getLocale } from "@/lib/preferences";
import {
  PER_PAGE,
  SORTS,
  getPublisher,
  isLanguage,
  isSort,
  listDocumentTypes,
  listGenres,
  parseTerms,
  searchCatalogue,
  type Language,
  type Sort,
} from "@/lib/catalogue";
import { getSession } from "@/app/(auth)/_lib/session";
import { googleConfig } from "@/app/(auth)/_lib/google";
import { languageName } from "./_lib/language";
import { Breadcrumb } from "./_components/breadcrumb";
import { Filters } from "./_components/filters";
import { LiveSearch } from "./_components/live-search";
import { Pagination } from "./_components/pagination";
import { DetailedResult, ListResult, type CardContext } from "./_components/result-card";
import { SortSelect } from "./_components/sort-select";

/** A record id carried back from the sign-in (`reserver`, `aimer`). */
const pendingId = (value: string | string[] | undefined) =>
  typeof value === "string" && /^\d+$/.test(value) ? Number(value) : null;

export const metadata: Metadata = { title: "Catalogue" };

type View = "etendu" | "liste";

/**
 * Search results, laid out after the CDI's reference design: filters down
 * the left, a results panel with the search and the count, then the list
 * with its view and sort controls. Every control is a link or a GET form,
 * so each state of the page is a URL: shareable, back-button friendly, and
 * working without JavaScript. Below `lg` the filters fold into a disclosure
 * above the list; the phone keeps the layout's bottom bar.
 */
export default async function CataloguePage({ searchParams }: PageProps<"/catalogue">) {
  const params = await searchParams;
  const [locale, session] = await Promise.all([getLocale(), getSession("opac")]);
  const messages = messagesFor(locale);
  const c = messages.catalogue;
  const isSubscriber = session !== null;

  // The home lives at "/" now; the bare catalogue URL (old bookmarks) goes
  // there. An empty search still lists everything.
  const keys = ["q", "genre", "support", "langue", "editeur", "tri", "vue", "page"] as const;
  if (keys.every((key) => params[key] === undefined)) redirect("/");

  const query = typeof params.q === "string" ? params.q : "";
  const page = Number(typeof params.page === "string" ? params.page : "1") || 1;
  const hasTerms = parseTerms(query).length > 0;
  // Relevance means nothing without words to rank by.
  const defaultSort: Sort = hasTerms ? "pertinence" : "titre";
  const sort: Sort =
    isSort(params.tri) && (params.tri !== "pertinence" || hasTerms) ? params.tri : defaultSort;
  const view: View = params.vue === "liste" ? "liste" : "etendu";

  // An unknown slug or id (a stale link, a renamed genre) drops the filter
  // rather than failing the page.
  const [genres, types] = await Promise.all([listGenres(locale), listDocumentTypes()]);
  const genre = genres.find((g) => g.slug === params.genre) ?? null;
  const type = types.find((t) => String(t.id) === params.support) ?? null;
  const language: Language | null = isLanguage(params.langue) ? params.langue : null;
  // From the publisher dialog's "see all": an unknown id drops the filter.
  const publisher =
    typeof params.editeur === "string" && /^\d+$/.test(params.editeur) ? await getPublisher(Number(params.editeur)) : null;

  const results = await searchCatalogue({
    query,
    page,
    isSubscriber,
    genre: genre?.slug ?? null,
    documentTypeId: type?.id ?? null,
    language,
    publisherId: publisher?.id ?? null,
    patronId: session ? Number(session.sub) : null,
    sort,
  });

  /** This page's URL with some state changed; any change but paging returns to page 1. */
  const urlFor = (
    next: Partial<{
      genre: string | null;
      support: number | null;
      langue: Language | null;
      editeur: number | null;
      tri: Sort;
      vue: View;
      page: number;
    }>,
  ) => {
    const state = {
      genre: genre?.slug ?? null,
      support: type?.id ?? null,
      langue: language,
      editeur: publisher?.id ?? null,
      tri: sort,
      vue: view,
      page: 1,
      ...next,
    };
    const target = new URLSearchParams({ q: query });
    if (state.genre) target.set("genre", state.genre);
    if (state.support) target.set("support", String(state.support));
    if (state.langue) target.set("langue", state.langue);
    if (state.editeur) target.set("editeur", String(state.editeur));
    if (state.tri !== defaultSort) target.set("tri", state.tri);
    if (state.vue !== "etendu") target.set("vue", state.vue);
    if (state.page > 1) target.set("page", String(state.page));
    return `/catalogue?${target}`;
  };

  // Hidden fields for the two GET forms, so neither drops the other state.
  const kept: Record<string, string> = {};
  if (genre) kept.genre = genre.slug;
  if (type) kept.support = String(type.id);
  if (language) kept.langue = language;
  if (publisher) kept.editeur = String(publisher.id);
  if (view !== "etendu") kept.vue = view;

  const activeFilters = [
    ...(type ? [{ label: type.label, href: urlFor({ support: null }) }] : []),
    ...(language ? [{ label: languageName(language, locale), href: urlFor({ langue: null }) }] : []),
    ...(publisher ? [{ label: publisher.name, href: urlFor({ editeur: null }) }] : []),
    ...(genre ? [{ label: genre.label, href: urlFor({ genre: null }) }] : []),
  ];
  const from = (results.page - 1) * PER_PAGE + 1;
  const to = from + results.hits.length - 1;

  const cardContext: CardContext = {
    messages,
    locale,
    returnTo: urlFor({ page: results.page }),
    signedIn: session !== null,
    googleReady: googleConfig() !== null,
    pendingReserve: pendingId(params.reserver),
    pendingLike: pendingId(params.aimer),
  };

  const filters = (
    <Filters
      types={types}
      genres={genres}
      activeType={type?.id ?? null}
      activeGenre={genre?.slug ?? null}
      typeHref={(support) => urlFor({ support })}
      activeLanguage={language}
      languageHref={(langue) => urlFor({ langue })}
      locale={locale}
      genreHref={(slug) => urlFor({ genre: slug })}
      messages={messages}
    />
  );

  return (
    <div className="grid gap-content lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start lg:gap-section xl:grid-cols-[18rem_minmax(0,1fr)]">
      <div className="stack min-w-0 gap-content lg:col-start-2">
        <Breadcrumb label={c.breadcrumbLabel} crumbs={[{ label: c.home, href: "/" }]} current={c.catalogueCrumb} />
        <section
          aria-labelledby="results-title"
          className="stack gap-4 rounded-panel border-2 border-accent bg-accent/10 p-4 sm:p-6"
        >
          <h1 id="results-title" className="font-heading text-heading-2">
            {c.resultsTitle}
          </h1>
          <LiveSearch
            messages={messages}
            defaultValue={query}
            keep={sort !== defaultSort && sort !== "pertinence" ? { ...kept, tri: sort } : kept}
          />
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <p className="text-body-sm" aria-live="polite">
              {results.total === 0
                ? fill(c.resultsCount, { count: "0" })
                : fill(c.resultsRange, {
                    from: String(from),
                    to: String(to),
                    total: String(results.total),
                  })}{" "}
              {hasTerms ? <span className="text-foreground-muted">{fill(c.resultsFor, { query })}</span> : null}
            </p>
            {activeFilters.map((filter) => (
              <Link
                key={filter.href}
                href={filter.href}
                scroll={false}
                aria-label={fill(c.removeFilter, { label: filter.label })}
                className="cluster min-h-9 gap-1.5 rounded-full border border-accent bg-surface px-3 text-caption font-medium outline-offset-2 hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-ring"
              >
                {filter.label}
                <X aria-hidden="true" className="size-3.5" />
              </Link>
            ))}
            {activeFilters.length > 1 ? (
              <Link
                href={urlFor({ genre: null, support: null, langue: null, editeur: null })}
                scroll={false}
                className="text-caption font-semibold text-foreground underline underline-offset-2 outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring"
              >
                {c.clearFilters}
              </Link>
            ) : null}
          </div>
        </section>

        {/* Below lg the filters fold away. Keyed on the filters, so a choice
            made inside closes it again once the list has updated. */}
        <details
          key={`${genre?.slug}-${type?.id}-${language}`}
          className="details-smooth group rounded-card border border-border bg-surface lg:hidden"
        >
          <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 rounded-card px-4 font-heading text-body font-semibold outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
            <SlidersHorizontal aria-hidden="true" className="size-5 text-accent" />
            <span className="flex-1">{fill(c.filtersButton, { count: String(activeFilters.length) })}</span>
            <ChevronDown
              aria-hidden="true"
              className="size-5 text-accent transition-transform group-open:rotate-180 motion-reduce:transition-none"
            />
          </summary>
          <div className="border-t border-border p-4">{filters}</div>
        </details>

        <div className="max-sm:hidden">
          <Pagination page={results.page} pageCount={results.pageCount} href={(n) => urlFor({ page: n })} label={c.paginationLabel} messages={messages} />
        </div>

        <div className="stack gap-4 rounded-panel bg-surface-muted p-3 sm:p-5">
          {results.hits.length === 0 ? (
            <div className="stack gap-inline rounded-card border border-border bg-surface p-6 text-center">
              <p className="text-body font-medium">{c.noResults}</p>
              <p className="text-body-sm text-foreground-muted">{c.noResultsHint}</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3">
                <div
                  role="group"
                  aria-label={c.viewLabel}
                  className="inline-flex rounded-control border border-border-strong bg-surface p-0.5"
                >
                  {(
                    [
                      ["etendu", c.viewDetailed, LayoutList],
                      ["liste", c.viewList, List],
                    ] as const
                  ).map(([value, label, Icon]) => (
                    <Link
                      key={value}
                      href={urlFor({ vue: value, page: results.page })}
                      scroll={false}
                      aria-current={view === value ? "true" : undefined}
                      className={`flex min-h-10 items-center gap-2 rounded-control px-3 text-body-sm font-medium outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring ${
                        view === value ? "bg-accent text-primary-foreground" : "text-foreground hover:bg-surface-muted"
                      }`}
                    >
                      <Icon aria-hidden="true" className="size-4" />
                      <span className="max-sm:sr-only">{label}</span>
                    </Link>
                  ))}
                </div>
                <SortSelect
                  label={c.sortLabel}
                  applyLabel={c.sortApply}
                  value={sort}
                  options={SORTS.filter((option) => option !== "pertinence" || hasTerms).map((option) => ({
                    value: option,
                    label: c.sorts[option],
                  }))}
                  keep={{ q: query, ...kept }}
                />
              </div>

              {view === "etendu" ? (
                <ol className="stack gap-4">
                  {results.hits.map((hit, index) => (
                    <li key={hit.id}>
                      <DetailedResult hit={hit} eager={index < 2} context={cardContext} />
                    </li>
                  ))}
                </ol>
              ) : (
                <ol className="stack gap-2">
                  {results.hits.map((hit) => (
                    <li key={hit.id}>
                      <ListResult hit={hit} context={cardContext} />
                    </li>
                  ))}
                </ol>
              )}
            </>
          )}
        </div>

        <Pagination page={results.page} pageCount={results.pageCount} href={(n) => urlFor({ page: n })} label={c.paginationEndLabel} messages={messages} />
      </div>

      {/* After the results in the DOM, so search and results come first to a
          keyboard or screen reader; placed in the left column by the grid. */}
      <aside
        aria-labelledby="filters-title"
        className="stack gap-content lg:col-start-1 lg:row-start-1 max-lg:hidden"
      >
        <h2 id="filters-title" className="font-heading text-heading-2">
          {c.filterTitle}
        </h2>
        {filters}
      </aside>
    </div>
  );
}
