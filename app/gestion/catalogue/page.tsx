import Link from "next/link";
import type { Metadata } from "next";
import { fill, messagesFor } from "@/lib/i18n";
import { getLocale } from "@/lib/preferences";
import { listRecords } from "@/lib/cataloguing";
import { requireSession } from "../../(auth)/_lib/session";

export const metadata: Metadata = { title: "Catalogage" };

export default async function CataloguingList({
  searchParams,
}: PageProps<"/gestion/catalogue">) {
  const [params, locale] = await Promise.all([searchParams, getLocale()]);
  await requireSession("gestion");

  const messages = messagesFor(locale);
  const c = messages.cataloguing;
  const query = typeof params.q === "string" ? params.q : "";
  const page = Number(typeof params.page === "string" ? params.page : "1") || 1;
  const results = await listRecords(query, page);

  const pageHref = (target: number) =>
    `/gestion/catalogue?${new URLSearchParams({ ...(query ? { q: query } : {}), page: String(target) })}`;

  return (
    <div className="stack gap-section">
      <header className="cluster justify-between gap-content">
        <div className="stack gap-inline">
          <h1 className="font-serif text-heading-1">{c.listTitle}</h1>
          <p className="text-body text-foreground-muted">{c.listIntro}</p>
        </div>
        <Link
          href="/gestion/catalogue/nouveau"
          className="min-h-11 cluster items-center rounded-control bg-primary px-4 text-body-sm font-medium text-primary-foreground outline-offset-2 hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-ring"
        >
          {c.newRecord}
        </Link>
      </header>

      <form method="get" className="cluster gap-2">
        <label className="flex-1">
          <span className="sr-only">{c.searchAction}</span>
          <input
            name="q"
            defaultValue={query}
            placeholder={c.searchPlaceholder}
            className="min-h-11 w-full rounded-control border border-border bg-background px-3 text-body-sm outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring"
          />
        </label>
        <button
          type="submit"
          className="min-h-11 cluster items-center rounded-control border border-border px-4 text-body-sm outline-offset-2 hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-ring"
        >
          {c.searchAction}
        </button>
      </form>

      {results.rows.length === 0 ? (
        <p className="rounded-card border border-border bg-surface p-6 text-center text-body-sm text-foreground-muted">
          {c.noRecords}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-card border border-border">
          <table className="w-full min-w-[46rem] text-body-sm">
            <thead className="bg-surface-muted text-caption text-foreground-muted">
              <tr>
                <th scope="col" className="p-3 text-left">{c.colTitle}</th>
                <th scope="col" className="p-3 text-left">{c.colAuthors}</th>
                <th scope="col" className="p-3 text-left">{c.colType}</th>
                <th scope="col" className="p-3 text-left">{c.colStatus}</th>
                <th scope="col" className="p-3 text-right">{c.colCopies}</th>
              </tr>
            </thead>
            <tbody>
              {results.rows.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  <td className="p-3">
                    <Link
                      href={`/gestion/catalogue/${row.id}`}
                      className="text-accent underline-offset-2 hover:underline"
                    >
                      {row.title}
                    </Link>
                  </td>
                  <td className="p-3 text-foreground-muted">{row.authors || "—"}</td>
                  <td className="p-3 text-foreground-muted">
                    {row.documentType ?? "—"}
                  </td>
                  <td className="p-3 text-foreground-muted">{row.status ?? "—"}</td>
                  <td className="p-3 text-right">{row.copies}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {results.pageCount > 1 ? (
        <nav
          className="cluster justify-between gap-2"
          aria-label={fill(messages.catalogue.pageOf, {
            page: String(results.page),
            pageCount: String(results.pageCount),
          })}
        >
          {results.page > 1 ? (
            <Link
              href={pageHref(results.page - 1)}
              className="min-h-11 cluster items-center rounded-control border border-border px-4 text-body-sm outline-offset-2 hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-ring"
            >
              ← {messages.catalogue.previous}
            </Link>
          ) : (
            <span />
          )}
          <span className="text-caption text-foreground-muted">
            {fill(messages.catalogue.pageOf, {
              page: String(results.page),
              pageCount: String(results.pageCount),
            })}
          </span>
          {results.page < results.pageCount ? (
            <Link
              href={pageHref(results.page + 1)}
              className="min-h-11 cluster items-center rounded-control border border-border px-4 text-body-sm outline-offset-2 hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-ring"
            >
              {messages.catalogue.next} →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </div>
  );
}
