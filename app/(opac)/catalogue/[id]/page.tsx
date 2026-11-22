import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { MapPin } from "lucide-react";
import { ShelfMark } from "@/app/_components/shelf-mark";
import { fill, messagesFor } from "@/lib/i18n";
import { getLocale } from "@/lib/preferences";
import { getRecord } from "@/lib/catalogue";
import { PICKUP_DAYS } from "@/lib/holds";
import { getSession } from "@/app/(auth)/_lib/session";
import { googleConfig } from "@/app/(auth)/_lib/google";
import { CoverImage } from "../../_components/cover-image";
import { eanOf } from "../_lib/identifiers";
import { languageName } from "../_lib/language";
import { AuthorLinks, EntityName } from "../_components/author-links";
import { Breadcrumb } from "../_components/breadcrumb";
import { LikeButton } from "../_components/like-button";
import { CopiesTable } from "../_components/locate-dialog";
import { ReserveButton } from "../_components/reserve-button";
import { Ribbon } from "../_components/result-card";
import { ShareButton } from "../_components/share-button";

export async function generateMetadata({ params }: PageProps<"/catalogue/[id]">): Promise<Metadata> {
  const { id } = await params;
  const record = await getRecord(Number(id), (await getSession("opac")) !== null);
  return { title: record?.title ?? "Catalogue" };
}

/** A record id carried back from the sign-in (`reserver`, `aimer`). */
const pendingId = (value: string | string[] | undefined) =>
  typeof value === "string" && /^\d+$/.test(value) ? Number(value) : null;

/**
 * A book, after the CDI's reference screen: the title, then a card with the
 * cover and "Localiser" on the left, and on the right the authors (each
 * opening their dialog), publication, collation, the summary, every
 * identifier and classification the record has, and the reader's actions.
 * The full list of copies follows. The breadcrumb's "Catalogue" goes back
 * to the list the reader came from, as it was.
 */
export default async function RecordPage({ params, searchParams }: PageProps<"/catalogue/[id]">) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId)) notFound();

  const query = await searchParams;
  const [locale, session] = await Promise.all([getLocale(), getSession("opac")]);
  const messages = messagesFor(locale);
  const c = messages.catalogue;
  const record = await getRecord(numericId, session !== null, session ? Number(session.sub) : null);
  const crumbs = [
    { label: c.home, href: "/" },
    { label: c.catalogueCrumb, href: "/catalogue?q=", back: true },
  ];

  // Not found and "hidden from the OPAC" are deliberately indistinguishable.
  if (!record) {
    return (
      <div className="stack gap-content">
        <Breadcrumb label={c.breadcrumbLabel} crumbs={crumbs} current={c.notFound} />
        <div className="mx-auto max-w-md stack gap-content rounded-card border border-border bg-surface p-6 text-center">
          <h1 className="font-heading text-heading-3">{c.notFound}</h1>
          <p className="text-body-sm text-foreground-muted">{c.notFoundHint}</p>
        </div>
      </div>
    );
  }

  const colon = locale === "fr" ? " :" : ":";
  const genre = record.genres[0] ?? null;
  const ean = eanOf(record.standardNumber);
  const callNumber =
    record.holdings.find((copy) => !copy.isOnLoan && copy.isLoanable)?.callNumber ??
    record.holdings.find((copy) => copy.callNumber)?.callNumber ??
    null;
  const available = record.holdings.filter((copy) => !copy.isOnLoan && copy.isLoanable).length;
  const collation = [record.pageCount, record.physicalDetails, record.dimensions].filter(Boolean).join(" ; ");
  const returnTo = `/catalogue/${record.id}`;
  const signedIn = session !== null;
  const googleReady = googleConfig() !== null;

  const facts: [string, React.ReactNode][] = [];
  if (record.languages.length) {
    facts.push([c.language, record.languages.map((code) => languageName(code, locale)).join(", ")]);
  }
  if (record.standardNumber) facts.push([c.isbn, <span key="isbn" className="tabular-nums">{record.standardNumber}</span>]);
  if (ean) facts.push([c.ean, <span key="ean" className="tabular-nums">{ean}</span>]);
  if (callNumber) facts.push([c.callNumber, <span key="call" className="font-mono font-semibold">{callNumber}</span>]);
  // Under the call number, each publisher opening its dialog (CDI request).
  if (record.publishers.length) {
    facts.push([
      c.publisher,
      <span key="publishers">
        {record.publishers.map((publisher, index) => (
          <span key={publisher.id}>
            {index > 0 ? ", " : null}
            <EntityName kind="publisher" entity={publisher} messages={messages} />
          </span>
        ))}
      </span>,
    ]);
  }
  if (record.classification) {
    facts.push([
      c.classification,
      <span key="dewey">
        <span className="font-mono">{record.classification}</span>
        {record.classificationLabel ? ` — ${record.classificationLabel}` : ""}
      </span>,
    ]);
  }
  if (record.series) facts.push([c.series, record.volume ? `${record.series}, ${record.volume}` : record.series]);
  if (record.collection) facts.push([c.collection, record.collection]);
  if (record.edition) facts.push([c.edition, record.edition]);

  return (
    <div className="stack gap-content">
      <Breadcrumb label={c.breadcrumbLabel} crumbs={crumbs} current={record.title} />

      {/* Above the card from `sm`; a phone reads it under the cover instead
          (CDI request), so here it is kept for screen readers only. */}
      <header className="stack gap-1 max-sm:sr-only">
        <h1 className="font-heading text-heading-1 leading-tight text-balance">{record.title}</h1>
        {record.subtitle ? <p className="text-body text-foreground-muted">{record.subtitle}</p> : null}
      </header>

      <article className="relative grid overflow-hidden rounded-card border border-border bg-surface shadow-card sm:grid-cols-[13rem_1fr] sm:gap-6 sm:p-6 lg:grid-cols-[17rem_1fr]">
        {/* With its words from `sm`; on a phone, compact, clear of the centred
            cover. `contents`: the wrappers take no cell of the card's grid. */}
        <div className="contents max-sm:hidden">
          <Ribbon documentType={record.documentType} genre={genre} locale={locale} />
        </div>
        <div className="contents sm:hidden">
          <Ribbon documentType={record.documentType} genre={genre} locale={locale} variant="large" />
        </div>

        {/* The cover fills the card's width on a phone (CDI request); "Localiser"
            is gone, the copies being listed below the card. */}
        <div>
          <div className="relative aspect-[4/5] w-full overflow-hidden bg-surface-muted sm:aspect-[2/3] sm:rounded-control sm:shadow-card">
            <div aria-hidden="true" className="absolute inset-0 stack items-center justify-center gap-2 p-4 text-center">
              <ShelfMark className="w-1/2" />
              <span className="line-clamp-3 font-heading text-caption font-semibold text-foreground-muted">
                {record.title}
              </span>
            </div>
            {record.coverUrl ? <CoverImage src={record.coverUrl} eager sizes="(max-width: 639px) 100vw, 17rem" /> : null}
          </div>
        </div>

        <div className="stack min-w-0 gap-4 max-sm:p-5">
          {/* The phone's title, under the cover; the h1 above serves screen readers. */}
          <div aria-hidden="true" className="stack gap-1 sm:hidden">
            <p className="font-heading text-heading-2 leading-tight">{record.title}</p>
            {record.subtitle ? <p className="text-body text-foreground-muted">{record.subtitle}</p> : null}
          </div>
          {/* Clear of the ribbon in the card's top right corner. */}
          <div className="stack gap-1.5 sm:pr-44">
            <AuthorLinks authors={record.authors} className="text-heading-3 font-semibold text-accent" messages={messages} />
            {record.publicationYear || record.publishers.length ? (
              <p className="text-body">
                {record.publicationYear ? fill(c.publishedIn, { year: String(record.publicationYear) }) : null}
                {record.publicationYear && record.publishers.length ? " · " : null}
                {record.publishers.map((publisher) => publisher.name).join(", ")}
              </p>
            ) : null}
            {collation ? <p className="text-body-sm text-foreground-muted">{collation}</p> : null}
          </div>

          {record.abstract ? <p className="max-w-prose text-body leading-relaxed">{record.abstract}</p> : null}

          {facts.length > 0 ? (
            <dl className="grid gap-x-8 gap-y-2 text-body-sm sm:grid-cols-2">
              {facts.map(([label, value]) => (
                <div key={label} className="flex flex-wrap gap-x-1">
                  <dt className="font-semibold text-accent">
                    {label}
                    {colon}
                  </dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          {record.genres.length > 0 || record.subjects.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {record.genres.map((item) => (
                <Link
                  key={item.slug}
                  href={`/catalogue?q=&genre=${encodeURIComponent(item.slug)}`}
                  className="flex min-h-8 items-center rounded-full bg-accent px-3 text-caption font-semibold text-primary-foreground outline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                >
                  {locale === "en" ? (item.labelEn ?? item.labelFr) : item.labelFr}
                </Link>
              ))}
              {record.subjects.map((subject) => (
                <Link
                  key={subject}
                  href={`/catalogue?${new URLSearchParams({ q: subject })}`}
                  className="flex min-h-8 items-center rounded-full bg-surface-muted px-3 text-caption outline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                >
                  {subject}
                </Link>
              ))}
            </div>
          ) : null}

          <div className="mt-auto flex flex-wrap items-center gap-3 border-t border-border pt-4">
            {record.holdings.some((copy) => copy.isLoanable) ? (
              <ReserveButton
                recordId={record.id}
                title={record.title}
                intro={fill(c.reserveIntro, { days: String(PICKUP_DAYS) })}
                signedIn={signedIn}
                googleReady={googleReady}
                returnTo={returnTo}
                autoOpen={pendingId(query.reserver) === record.id}
                messages={messages}
              />
            ) : null}
            <span className="ml-auto flex items-center gap-1">
              <LikeButton
                key={`${record.liked}-${record.likeCount}`}
                recordId={record.id}
                liked={record.liked}
                count={record.likeCount}
                signedIn={signedIn}
                googleReady={googleReady}
                returnTo={returnTo}
                autoLike={pendingId(query.aimer) === record.id}
                large
                messages={messages}
              />
              {/* "Recommend" on phones only (CDI request). */}
              <span className="sm:hidden">
                <ShareButton recordId={record.id} title={record.title} messages={messages} />
              </span>
            </span>
          </div>
        </div>
      </article>

      <section id="exemplaires" aria-labelledby="copies-title" className="stack scroll-mt-6 gap-inline">
        <h2 id="copies-title" className="flex items-center gap-2 font-heading text-heading-3">
          <MapPin aria-hidden="true" className="size-5 text-accent" />
          {c.holdings}
          {record.holdings.length > 0 ? (
            <span className="font-sans text-body-sm font-semibold text-accent">
              · {fill(c.available, { count: String(available) })}
            </span>
          ) : null}
        </h2>
        {record.holdings.length === 0 ? (
          <p className="text-body-sm text-foreground-muted">{c.noHoldings}</p>
        ) : (
          <CopiesTable holdings={record.holdings} messages={messages} locale={locale} />
        )}
      </section>
    </div>
  );
}
