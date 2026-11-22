import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ExternalLink, UserRound } from "lucide-react";
import { fill, messagesFor } from "@/lib/i18n";
import { getLocale } from "@/lib/preferences";
import { getAuthor, searchCatalogue } from "@/lib/catalogue";
import { getSession } from "@/app/(auth)/_lib/session";
import { googleConfig } from "@/app/(auth)/_lib/google";
import { Breadcrumb } from "../../_components/breadcrumb";
import { Pagination } from "../../_components/pagination";
import { DetailedResult, type CardContext } from "../../_components/result-card";

/** A record id carried back from the sign-in (`reserver`, `aimer`). */
const pendingId = (value: string | string[] | undefined) =>
  typeof value === "string" && /^\d+$/.test(value) ? Number(value) : null;

export async function generateMetadata({ params }: PageProps<"/catalogue/auteur/[id]">): Promise<Metadata> {
  const { id } = await params;
  const author = await getAuthor(Number(id));
  return { title: author?.name ?? "Catalogue" };
}

/**
 * An author's page, reached from their name on a result or a record (CDI
 * request): who they are — legacy's author authority, whose `author_comment`
 * the OPAC showed — and every book of theirs the CDI holds, with the same
 * cards, actions and paging as the results.
 */
export default async function AuthorPage({ params, searchParams }: PageProps<"/catalogue/auteur/[id]">) {
  const { id } = await params;
  const authorId = Number(id);
  if (!Number.isInteger(authorId)) notFound();

  const query = await searchParams;
  const page = Number(typeof query.page === "string" ? query.page : "1") || 1;
  const [locale, session, author] = await Promise.all([getLocale(), getSession("opac"), getAuthor(authorId)]);
  if (!author) notFound();

  const messages = messagesFor(locale);
  const c = messages.catalogue;
  const results = await searchCatalogue({
    query: "",
    page,
    isSubscriber: session !== null,
    authorId,
    patronId: session ? Number(session.sub) : null,
    sort: "annee",
  });

  const href = (n: number) => (n > 1 ? `/catalogue/auteur/${authorId}?page=${n}` : `/catalogue/auteur/${authorId}`);
  const context: CardContext = {
    messages,
    locale,
    returnTo: href(results.page),
    signedIn: session !== null,
    googleReady: googleConfig() !== null,
    pendingReserve: pendingId(query.reserver),
    pendingLike: pendingId(query.aimer),
  };
  // The CDI writes the biography as plain text; blank lines make paragraphs.
  const biography = author.biography?.split(/\n\s*\n/).filter((paragraph) => paragraph.trim()) ?? [];

  return (
    <div className="stack gap-section">
      <Breadcrumb
        label={c.breadcrumbLabel}
        crumbs={[
          { label: c.home, href: "/" },
          { label: c.catalogueCrumb, href: "/catalogue?q=", back: true },
        ]}
        current={author.name}
      />

      <header className="grid gap-5 rounded-panel border-2 border-accent bg-accent/10 p-5 sm:grid-cols-[auto_1fr] sm:p-6">
        <span
          aria-hidden="true"
          className="grid size-16 place-items-center rounded-full bg-accent text-primary-foreground sm:size-20"
        >
          <UserRound className="size-9 sm:size-10" strokeWidth={1.75} />
        </span>
        <div className="stack gap-3">
          <div className="stack gap-1">
            <h1 className="font-heading text-heading-1 leading-tight">{author.name}</h1>
            {author.dates ? <p className="text-body text-foreground-muted">{author.dates}</p> : null}
          </div>
          {biography.length > 0 ? (
            <div className="stack max-w-prose gap-3 text-body">
              {biography.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          ) : (
            <p className="text-body-sm text-foreground-muted">{c.noBiography}</p>
          )}
          {/* Typed in Gestion: only a web address becomes a link. */}
          {/^https?:\/\//.test(author.website ?? "") ? (
            <a
              href={author.website ?? undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-fit items-center gap-1.5 text-body-sm font-medium text-accent underline underline-offset-2 outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring"
            >
              {c.authorWebsite}
              <ExternalLink aria-hidden="true" className="size-4" />
            </a>
          ) : null}
        </div>
      </header>

      <section aria-labelledby="author-books" className="stack gap-content">
        <h2 id="author-books" className="font-heading text-heading-2">
          {fill(c.authorBooks, { name: author.name })}{" "}
          <span className="text-body font-normal text-foreground-muted">({results.total})</span>
        </h2>
        {results.hits.length === 0 ? (
          <p className="rounded-card border border-border bg-surface p-6 text-center text-body-sm text-foreground-muted">
            {c.noResults}
          </p>
        ) : (
          <ol className="stack gap-4">
            {results.hits.map((hit, index) => (
              <li key={hit.id}>
                <DetailedResult hit={hit} eager={index < 2} context={context} />
              </li>
            ))}
          </ol>
        )}
        <Pagination
          page={results.page}
          pageCount={results.pageCount}
          href={href}
          label={c.paginationLabel}
          messages={messages}
        />
      </section>
    </div>
  );
}
