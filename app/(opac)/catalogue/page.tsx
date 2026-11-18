import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { X } from "lucide-react";
import { fill, messagesFor } from "@/lib/i18n";
import { getLocale } from "@/lib/preferences";
import { listGenres, searchCatalogue } from "@/lib/catalogue";
import { getSession } from "@/app/(auth)/_lib/session";
import { Availability } from "../_components/availability";
import { SearchBar } from "../_components/search-bar";

export const metadata: Metadata = { title: "Catalogue" };

export default async function CataloguePage({
  searchParams,
}: PageProps<"/catalogue">) {
  const params = await searchParams;
  const [locale, session] = await Promise.all([getLocale(), getSession("opac")]);
  const messages = messagesFor(locale);
  const isSubscriber = session !== null;

  // The home lives at "/" now; the bare catalogue URL (old bookmarks) goes
  // there. An empty search still lists everything.
  if (params.q === undefined && params.genre === undefined && params.page === undefined) {
    redirect("/");
  }

  const query = typeof params.q === "string" ? params.q : "";
  const page = Number(typeof params.page === "string" ? params.page : "1") || 1;
  const c = messages.catalogue;

  // An unknown slug (a stale link, a renamed genre) drops the filter rather
  // than failing the page.
  const genres = await listGenres(locale);
  const genre = genres.find((g) => g.slug === params.genre) ?? null;

  // Subscriber-only records join the results once a patron is signed in.
  const results = await searchCatalogue(query, page, isSubscriber, genre?.slug ?? null);

  const href = (next: { page?: number; genre?: string | null }) => {
    const target = new URLSearchParams({ q: query });
    const keptGenre = next.genre === undefined ? genre?.slug : next.genre;
    if (keptGenre) target.set("genre", keptGenre);
    if (next.page && next.page > 1) target.set("page", String(next.page));
    return `/catalogue?${target}`;
  };

  return (
    <div className="stack gap-section">
      <section className="stack gap-content">
        <div className="stack gap-inline">
          <h1 className="font-heading text-heading-1">{genre ? genre.label : c.title}</h1>
          {genre ? null : (
            <p className="text-body text-foreground-muted">{c.intro}</p>
          )}
        </div>
        <SearchBar messages={messages} defaultValue={query} genre={genre?.slug} />
      </section>

      <section className="stack gap-content">
        <div className="cluster gap-3">
          <p className="text-body-sm text-foreground-muted" aria-live="polite">
            {fill(c.resultsCount, { count: String(results.total) })}{" "}
            {query
              ? fill(c.resultsFor, { query })
              : genre
                ? null
                : c.browsingAll.toLowerCase()}
          </p>
          {genre ? (
            <Link
              href={href({ genre: null })}
              aria-label={fill(c.clearGenre, { genre: genre.label })}
              className="cluster min-h-9 gap-1.5 rounded-full border border-border bg-surface px-3 text-caption outline-offset-2 hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-ring"
            >
              {fill(c.genreFilter, { genre: genre.label })}
              <X aria-hidden="true" className="size-3.5" />
            </Link>
          ) : null}
        </div>

        {results.hits.length === 0 ? (
          <div className="stack gap-inline rounded-card border border-border bg-surface p-6 text-center">
            <p className="text-body font-medium">{c.noResults}</p>
            <p className="text-body-sm text-foreground-muted">
              {c.noResultsHint}
            </p>
          </div>
        ) : (
          <ul className="stack gap-inline">
            {results.hits.map((hit) => (
              <li key={hit.id}>
                <Link
                  href={`/catalogue/${hit.id}`}
                  className="stack gap-1.5 rounded-card border border-border bg-surface p-4 outline-offset-2 hover:border-border-strong focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <span className="font-heading text-heading-3">{hit.title}</span>
                  {hit.subtitle ? (
                    <span className="text-body-sm text-foreground-muted">
                      {hit.subtitle}
                    </span>
                  ) : null}
                  <span className="text-body-sm text-foreground-muted">
                    {hit.authors.join(", ") || "—"}
                    {hit.publicationYear ? ` · ${hit.publicationYear}` : ""}
                    {hit.documentType ? ` · ${hit.documentType}` : ""}
                  </span>
                  <Availability
                    totalItems={hit.totalItems}
                    availableItems={hit.availableItems}
                    messages={messages}
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}

        {results.pageCount > 1 ? (
          <nav
            className="cluster justify-between gap-2"
            aria-label={fill(c.pageOf, {
              page: String(results.page),
              pageCount: String(results.pageCount),
            })}
          >
            {results.page > 1 ? (
              <Link
                href={href({ page: results.page - 1 })}
                className="min-h-11 cluster items-center rounded-control border border-border px-4 text-body-sm outline-offset-2 hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-ring"
              >
                ← {c.previous}
              </Link>
            ) : (
              <span />
            )}
            <span className="text-caption text-foreground-muted">
              {fill(c.pageOf, {
                page: String(results.page),
                pageCount: String(results.pageCount),
              })}
            </span>
            {results.page < results.pageCount ? (
              <Link
                href={href({ page: results.page + 1 })}
                className="min-h-11 cluster items-center rounded-control border border-border px-4 text-body-sm outline-offset-2 hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-ring"
              >
                {c.next} →
              </Link>
            ) : (
              <span />
            )}
          </nav>
        ) : null}
      </section>
    </div>
  );
}
