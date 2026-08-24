import Link from "next/link";
import type { Metadata } from "next";
import { fill, messagesFor, type Messages } from "@/lib/i18n";
import { getLocale } from "@/lib/preferences";
import { searchCatalogue, type SearchHit } from "@/lib/catalogue";
import { getSession } from "../(auth)/_lib/session";
import { SearchBar } from "./_components/search-bar";

export const metadata: Metadata = { title: "Catalogue" };

/** Availability at a glance — legacy made you open the record to find out. */
function Availability({
  hit,
  messages,
}: {
  hit: SearchHit;
  messages: Messages;
}) {
  if (hit.totalItems === 0) {
    return (
      <span className="text-caption text-foreground-subtle">
        {messages.catalogue.noHoldings}
      </span>
    );
  }
  if (hit.availableItems === 0) {
    return (
      <span className="cluster gap-1.5 text-caption text-foreground-muted">
        <span aria-hidden="true" className="size-2 rounded-full bg-warning" />
        {messages.catalogue.allOnLoan}
      </span>
    );
  }
  return (
    <span className="cluster gap-1.5 text-caption text-success">
      <span aria-hidden="true" className="size-2 rounded-full bg-success" />
      {fill(messages.catalogue.available, {
        count: String(hit.availableItems),
      })}
    </span>
  );
}

export default async function CataloguePage({
  searchParams,
}: PageProps<"/catalogue">) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q : "";
  const page = Number(typeof params.page === "string" ? params.page : "1") || 1;

  const [messages, session] = await Promise.all([
    getLocale().then(messagesFor),
    getSession("opac"),
  ]);
  const c = messages.catalogue;
  // Subscriber-only records join the results once a patron is signed in.
  const results = await searchCatalogue(query, page, session !== null);

  const pageHref = (target: number) =>
    `/catalogue?${new URLSearchParams({ ...(query ? { q: query } : {}), page: String(target) })}`;

  return (
    <div className="stack gap-section">
      <section className="stack gap-content">
        <div className="stack gap-inline">
          <h1 className="font-serif text-heading-1">{c.title}</h1>
          <p className="text-body text-foreground-muted">{c.intro}</p>
        </div>
        <SearchBar messages={messages} defaultValue={query} />
      </section>

      <section className="stack gap-content">
        <p className="text-body-sm text-foreground-muted" aria-live="polite">
          {fill(c.resultsCount, { count: String(results.total) })}{" "}
          {query ? fill(c.resultsFor, { query }) : c.browsingAll.toLowerCase()}
        </p>

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
                  <span className="font-serif text-heading-3">{hit.title}</span>
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
                  <Availability hit={hit} messages={messages} />
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
                href={pageHref(results.page - 1)}
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
                href={pageHref(results.page + 1)}
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
