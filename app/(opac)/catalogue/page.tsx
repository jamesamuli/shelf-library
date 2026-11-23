import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ArrowRight, ChevronDown, SlidersHorizontal, X } from "lucide-react";
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
import { VIEW_COOKIE, isView, type View } from "./_lib/view";
import { BackToTop } from "./_components/back-to-top";
import { Breadcrumb } from "./_components/breadcrumb";
import { Filters } from "./_components/filters";
import { LiveSearch } from "./_components/live-search";
import { LinkLoader } from "../_components/route-loader";
import { Pagination } from "./_components/pagination";
import { DetailedResult, ListResult, type CardContext } from "./_components/result-card";
import { ResultViews } from "./_components/result-views";
import { SortSelect } from "./_components/sort-select";

/** A record id carried back from the sign-in (`reserver`, `aimer`). */
const pendingId = (value: string | string[] | undefined) =>
  typeof value === "string" && /^\d+$/.test(value) ? Number(value) : null;

export const metadata: Metadata = { title: "Catalogue" };

/**
 * Search results, laid out after the CDI's reference design: filters down
 * the left, a results panel with the search and the count, then the list
 * with its view and sort controls. Every control is a link or a GET form,
 * so each state of the page is a URL: shareable, back-button friendly, and
 * working without JavaScript — but the layout (detailed or list), a
 * personal preference switched in place. Below `lg` the filters fold into a disclosure
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
  const keys = ["q", "genre", "support", "langue", "editeur", "dispo", "tri", "vue", "page"] as const;
  if (keys.every((key) => params[key] === undefined)) redirect("/");

  const query = typeof params.q === "string" ? params.q : "";
  const page = Number(typeof params.page === "string" ? params.page : "1") || 1;
  // The phone's "Voir plus de livres": pages 1 to `page`, one growing list.
  const cumulative = params.suite === "1";
  const hasTerms = parseTerms(query).length > 0;
  // Relevance means nothing without words to rank by.
  const defaultSort: Sort = hasTerms ? "pertinence" : "titre";
  const sort: Sort =
    isSort(params.tri) && (params.tri !== "pertinence" || hasTerms) ? params.tri : defaultSort;
  // The reader's last choice; `vue` in the address (the switch without
  // JavaScript, an old link) overrides it.
  const savedView = (await cookies()).get(VIEW_COOKIE)?.value;
  const view: View = isView(params.vue) ? params.vue : isView(savedView) ? savedView : "etendu";

  // An unknown slug or id (a stale link, a renamed genre) drops the filter
  // rather than failing the page.
  const [genres, types] = await Promise.all([listGenres(locale), listDocumentTypes()]);
  const genre = genres.find((g) => g.slug === params.genre) ?? null;
  const type = types.find((t) => String(t.id) === params.support) ?? null;
  const language: Language | null = isLanguage(params.langue) ? params.langue : null;
  const availableOnly = params.dispo === "1";
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
    availableOnly,
    cumulative,
    withFacets: true,
    sort,
  });

  /** This page's URL with some state changed; any change but paging returns to page 1. */
  const urlFor = (
    next: Partial<{
      genre: string | null;
      support: number | null;
      langue: Language | null;
      editeur: number | null;
      dispo: boolean;
      tri: Sort;
      vue: View | null;
      page: number;
      suite: boolean;
    }>,
  ) => {
    const state = {
      genre: genre?.slug ?? null,
      support: type?.id ?? null,
      langue: language,
      editeur: publisher?.id ?? null,
      dispo: availableOnly,
      tri: sort,
      // Not carried: the view is a cookie, switched without a new page.
      vue: null,
      page: 1,
      suite: false,
      ...next,
    };
    const target = new URLSearchParams({ q: query });
    if (state.genre) target.set("genre", state.genre);
    if (state.support) target.set("support", String(state.support));
    if (state.langue) target.set("langue", state.langue);
    if (state.editeur) target.set("editeur", String(state.editeur));
    if (state.dispo) target.set("dispo", "1");
    if (state.tri !== defaultSort) target.set("tri", state.tri);
    if (state.vue) target.set("vue", state.vue);
    if (state.page > 1) target.set("page", String(state.page));
    if (state.suite && state.page > 1) target.set("suite", "1");
    return `/catalogue?${target}`;
  };

  // Hidden fields for the two GET forms, so neither drops the other state.
  const kept: Record<string, string> = {};
  if (genre) kept.genre = genre.slug;
  if (type) kept.support = String(type.id);
  if (language) kept.langue = language;
  if (publisher) kept.editeur = String(publisher.id);
  if (availableOnly) kept.dispo = "1";

  const activeFilters = [
    ...(availableOnly ? [{ label: c.availableNow, href: urlFor({ dispo: false }) }] : []),
    ...(type ? [{ label: type.label, href: urlFor({ support: null }) }] : []),
    ...(language ? [{ label: languageName(language, locale), href: urlFor({ langue: null }) }] : []),
    ...(publisher ? [{ label: publisher.name, href: urlFor({ editeur: null }) }] : []),
    ...(genre ? [{ label: genre.label, href: urlFor({ genre: null }) }] : []),
  ];
  const from = cumulative ? 1 : (results.page - 1) * PER_PAGE + 1;
  const to = from + results.hits.length - 1;
  const range = { from: String(from), to: String(to), total: String(results.total) };
  const remaining = results.total - to;
  const clearAll = urlFor({ genre: null, support: null, langue: null, editeur: null, dispo: false });

  const cardContext: CardContext = {
    messages,
    locale,
    returnTo: urlFor({ page: results.page, suite: cumulative }),
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
      availableOnly={availableOnly}
      availableHref={urlFor({ dispo: !availableOnly })}
      facets={results.facets}
      messages={messages}
    />
  );

  return (
    <div className="grid gap-content lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start lg:gap-section xl:grid-cols-[18rem_minmax(0,1fr)]">
      <div className="stack min-w-0 gap-content lg:col-start-2">
        <Breadcrumb label={c.breadcrumbLabel} crumbs={[{ label: c.home, href: "/" }]} current={c.catalogueCrumb} />
        {/* One compact band (CDI request): the title with the count, the
            search, and the active filters only when there are some. */}
        <section
          aria-labelledby="results-title"
          className="stack gap-3 rounded-panel border-2 border-accent bg-accent/10 p-4 sm:px-6 sm:py-5"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h1 id="results-title" tabIndex={-1} className="font-heading text-heading-3 outline-none">
              {c.resultsTitle}
            </h1>
            <p className="text-body-sm" aria-live="polite">
              {results.total === 0 ? fill(c.resultsCount, { count: "0" }) : fill(c.resultsRange, range)}{" "}
              {hasTerms ? <span className="text-foreground-muted">{fill(c.resultsFor, { query })}</span> : null}
            </p>
          </div>
          <LiveSearch
            messages={messages}
            defaultValue={query}
            keep={sort !== defaultSort && sort !== "pertinence" ? { ...kept, tri: sort } : kept}
          />
          {activeFilters.length > 0 ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
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
                <LinkLoader />
              </Link>
            ))}
            {activeFilters.length > 1 ? (
              <Link
                href={clearAll}
                scroll={false}
                className="text-caption font-semibold text-foreground underline underline-offset-2 outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring"
              >
                {c.clearFilters}
                <LinkLoader />
              </Link>
            ) : null}
          </div>
          ) : null}
        </section>

        {/* Below lg the filters fold away. Keyed on the filters, so a choice
            made inside closes it again once the list has updated. */}
        <details
          key={`${genre?.slug}-${type?.id}-${language}-${availableOnly}`}
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
          <div className="border-t border-border p-4">
            {/* The aside's visible "Filtrer la recherche", for the outline:
                the filter groups below are h3s. */}
            <h2 className="sr-only">{c.filterTitle}</h2>
            {filters}
          </div>
        </details>

        <div className="stack gap-4 rounded-panel bg-surface-muted p-3 sm:p-5">
          {results.hits.length === 0 ? (
            // Ways out rather than a dead end (CDI request): lift a filter,
            // search the whole catalogue, or browse a genre.
            <div className="stack items-center gap-5 rounded-card border border-border bg-surface p-6 text-center">
              <div className="stack gap-inline">
                <p className="font-heading text-heading-3">{c.noResults}</p>
                <p className="text-body-sm text-foreground-muted">{c.noResultsHint}</p>
              </div>
              {activeFilters.length > 0 ? (
                <div className="stack items-center gap-2">
                  <p className="text-body-sm font-semibold">{c.noResultsRemove}</p>
                  <ul className="flex flex-wrap justify-center gap-2">
                    {activeFilters.map((filter) => (
                      <li key={filter.href}>
                        <Link
                          href={filter.href}
                          scroll={false}
                          aria-label={fill(c.removeFilter, { label: filter.label })}
                          className="cluster min-h-11 gap-1.5 rounded-full border-2 border-accent bg-surface px-4 text-body-sm font-semibold outline-offset-2 hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-ring"
                        >
                          {filter.label}
                          <X aria-hidden="true" className="size-4" />
                          <LinkLoader />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <Link
                href={hasTerms && activeFilters.length > 0 ? clearAll : "/catalogue?q="}
                className="cluster min-h-11 gap-2 rounded-control bg-accent px-5 text-body-sm font-semibold text-primary-foreground outline-offset-2 transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-ring"
              >
                {hasTerms && activeFilters.length > 0 ? fill(c.noResultsEverywhere, { query }) : c.noResultsWhole}
                <ArrowRight aria-hidden="true" className="size-4" />
                <LinkLoader />
              </Link>
              <div className="stack items-center gap-2">
                <p className="text-body-sm font-semibold">{c.noResultsGenres}</p>
                <ul className="flex flex-wrap justify-center gap-2">
                  {genres.map((item) => (
                    <li key={item.slug}>
                      <Link
                        href={`/catalogue?q=&genre=${encodeURIComponent(item.slug)}`}
                        className="flex min-h-11 items-center rounded-full bg-surface-muted px-4 text-body-sm outline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                      >
                        {item.label}
                        <LinkLoader />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <>
              {/* Both views of this page, the switch only showing one or the
                  other (CDI request: no reload to change the layout). */}
              <ResultViews
                initial={view}
                summary={fill(c.resultsShort, range)}
                labels={{ group: c.viewLabel, etendu: c.viewDetailed, liste: c.viewList }}
                hrefs={{
                  etendu: urlFor({ vue: "etendu", page: results.page }),
                  liste: urlFor({ vue: "liste", page: results.page }),
                }}
                sort={
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
                }
                detailed={
                  <ol className="stack gap-4">
                    {results.hits.map((hit, index) => (
                      <li key={hit.id}>
                        <DetailedResult hit={hit} eager={index < 2} context={cardContext} />
                      </li>
                    ))}
                  </ol>
                }
                list={
                  <ol className="stack gap-2">
                    {results.hits.map((hit) => (
                      <li key={hit.id}>
                        <ListResult hit={hit} context={cardContext} />
                      </li>
                    ))}
                  </ol>
                }
              />
            </>
          )}
        </div>

        <div className="max-sm:hidden">
          <Pagination page={results.page} pageCount={results.pageCount} href={(n) => urlFor({ page: n })} label={c.paginationEndLabel} messages={messages} />
        </div>
        {/* Phones: the list grows instead of turning a page (CDI request);
            the reader stays where they were, the next books beneath. */}
        {remaining > 0 ? (
          <Link
            href={urlFor({ page: results.page + 1, suite: true })}
            scroll={false}
            className="stack min-h-14 items-center justify-center rounded-card border-3 border-dashed border-accent bg-surface px-4 py-2 text-center shadow-card outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring sm:hidden"
          >
            <span className="font-heading text-body font-semibold text-accent">{c.loadMore}</span>
            <span className="text-caption text-foreground-muted">{fill(c.loadMoreHint, { count: String(remaining) })}</span>
            <LinkLoader />
          </Link>
        ) : null}
        <BackToTop label={c.backToTop} target="results-title" />
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
