import Link from "next/link";
import { ChevronDown, MapPin } from "lucide-react";
import { ShelfMark } from "@/app/_components/shelf-mark";
import type { SearchHit } from "@/lib/catalogue";
import { PICKUP_DAYS } from "@/lib/holds";
import { fill, type Messages } from "@/lib/i18n";
import type { Locale } from "@/lib/preferences";
import { Availability } from "../../_components/availability";
import { CoverImage } from "../../_components/cover-image";
import { genreStyle } from "../../_components/genre-tile";
import { eanOf } from "../_lib/identifiers";
import { languageName } from "../_lib/language";
import { AuthorLinks } from "./author-links";
import { documentTypeStyle } from "./filters";
import { LikeButton } from "./like-button";
import { LocateButton } from "./locate-dialog";
import { ShareButton } from "./share-button";
import { ReserveButton } from "./reserve-button";

/** What a card needs to know about the page it sits on. */
export type CardContext = {
  messages: Messages;
  locale: Locale;
  /** This page's URL, where a sign-in brings the reader back to. */
  returnTo: string;
  signedIn: boolean;
  /** Whether Google sign-in is configured; the sign-in dialog falls back otherwise. */
  googleReady: boolean;
  /** The record the reader asked to reserve before signing in. */
  pendingReserve: number | null;
  /** The record the reader asked to like before signing in. */
  pendingLike: number | null;
};

/**
 * The record's type and genre beside a bookmark ribbon in the genre's colour
 * (after the CDI's reference design); the document type's colour when the
 * record has no genre. `labelled` shows the words beside it; `large` (the
 * phone cards) and `small` (the home's new arrivals) show the ribbon alone,
 * the words kept for screen readers (CDI requests).
 */
export function Ribbon({
  documentType,
  genre,
  locale,
  variant = "labelled",
}: {
  documentType: string | null;
  genre: { labelFr: string; labelEn: string | null; icon: string; colour: string } | null;
  locale: Locale;
  variant?: "labelled" | "large" | "small";
}) {
  const compact = variant !== "labelled";
  const genreLabel = genre ? (locale === "en" ? (genre.labelEn ?? genre.labelFr) : genre.labelFr) : null;
  const { Icon, fill: colour } = genre ? genreStyle(genre.icon, genre.colour) : documentTypeStyle(documentType ?? "");
  if (!documentType && !genreLabel) return null;
  return (
    <div className={`absolute top-0 z-10 flex items-start gap-2 ${variant === "small" ? "right-3" : compact ? "right-4" : "right-5"}`}>
      <p className={compact ? "sr-only" : "stack pt-2 text-right"}>
        {documentType ? (
          <span className="text-caption font-semibold uppercase tracking-wide text-accent">{documentType}</span>
        ) : null}
        {compact && documentType && genreLabel ? ", " : null}
        {genreLabel ? <span className="text-caption text-foreground-muted">{genreLabel}</span> : null}
      </p>
      <span
        aria-hidden="true"
        className={`grid place-items-start justify-center text-white shadow-card [clip-path:polygon(0_0,100%_0,100%_100%,50%_76%,0_100%)] ${
          { labelled: "h-14 w-10 pt-2", large: "h-20 w-14 pt-3", small: "h-12 w-9 pt-2" }[variant]
        } ${colour}`}
      >
        <Icon className={variant === "large" ? "size-7" : "size-5"} strokeWidth={2} />
      </span>
    </div>
  );
}

/** The cover over its Shelf stand-in, zooming smoothly while the card is pointed at. */
function Cover({ hit, eager, sizes }: { hit: SearchHit; eager: boolean; sizes: string }) {
  return (
    <>
      <span className="absolute inset-0 stack items-center justify-center gap-2 bg-surface-muted p-3 text-center">
        <ShelfMark className="w-1/2" />
        <span className="line-clamp-3 font-heading text-caption font-semibold text-foreground-muted">{hit.title}</span>
      </span>
      {hit.coverUrl ? (
        <span className="absolute inset-0 transition-[scale] duration-500 ease-out group-focus-within/card:scale-[1.06] group-hover/card:scale-[1.06] motion-reduce:transition-none motion-reduce:group-focus-within/card:scale-100 motion-reduce:group-hover/card:scale-100">
          <CoverImage src={hit.coverUrl} eager={eager} sizes={sizes} />
        </span>
      ) : null}
    </>
  );
}

const canReserve = (hit: SearchHit) => hit.holdings.some((copy) => copy.isLoanable);

function Reserve({ hit, context, icon = false }: { hit: SearchHit; context: CardContext; icon?: boolean }) {
  return (
    <ReserveButton
      recordId={hit.id}
      title={hit.title}
      intro={fill(context.messages.catalogue.reserveIntro, { days: String(PICKUP_DAYS) })}
      signedIn={context.signedIn}
      googleReady={context.googleReady}
      returnTo={context.returnTo}
      autoOpen={context.pendingReserve === hit.id}
      icon={icon}
      messages={context.messages}
    />
  );
}

function Like({ hit, context, large = false }: { hit: SearchHit; context: CardContext; large?: boolean }) {
  return (
    <LikeButton
      key={`${hit.liked}-${hit.likeCount}`}
      recordId={hit.id}
      liked={hit.liked}
      count={hit.likeCount}
      signedIn={context.signedIn}
      googleReady={context.googleReady}
      returnTo={context.returnTo}
      autoLike={context.pendingLike === hit.id}
      large={large}
      messages={context.messages}
    />
  );
}

/**
 * The detailed view, from `sm` up (CDI request): the cover filling the
 * card's left side, then title, authors (each opening their dialog), the
 * summary, language, ISBN and call number, the two actions, and the heart
 * in the bottom right corner.
 */
function DetailedCard({ hit, eager, context }: { hit: SearchHit; eager: boolean; context: CardContext }) {
  const { messages, locale } = context;
  const c = messages.catalogue;
  const languages = hit.languages.map((code) => languageName(code, locale)).join(", ");
  // French sets a space before the colon; English does not.
  const colon = locale === "fr" ? " :" : ":";
  const facts = [
    languages ? [c.language, languages] : null,
    hit.standardNumber ? [c.isbn, hit.standardNumber] : null,
  ].filter((fact): fact is string[] => fact !== null);

  return (
    <article className="group/card relative grid grid-cols-[10rem_1fr] overflow-hidden rounded-card border border-border bg-surface shadow-card transition-shadow duration-300 hover:shadow-popover max-sm:hidden lg:grid-cols-[12rem_1fr]">
      {/* The title link names the record; the cover is a larger target for
          the same place, so it stays out of the tab order and silent. */}
      <Link
        href={`/catalogue/${hit.id}`}
        tabIndex={-1}
        aria-hidden="true"
        className="relative min-h-60 overflow-hidden lg:min-h-72"
      >
        <Cover hit={hit} eager={eager} sizes="12rem" />
      </Link>

      <div className="stack min-w-0 gap-3 p-5 lg:p-6">
        <Ribbon documentType={hit.documentType} genre={hit.genre} locale={locale} />
        {/* Clear of the ribbon, which takes the card's top right corner. */}
        <h2 className="pr-44 font-heading text-heading-3 leading-tight text-balance">
          <Link
            href={`/catalogue/${hit.id}`}
            className="rounded-control outline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
          >
            {hit.title}
          </Link>
        </h2>
        <AuthorLinks authors={hit.authors} className="-mt-1 text-body-sm font-semibold text-accent" messages={messages} />
        {hit.abstract ? <p className="line-clamp-4 text-body-sm text-foreground-muted">{hit.abstract}</p> : null}
        {facts.length > 0 || hit.callNumber ? (
          <dl className="flex flex-wrap gap-x-6 gap-y-1 text-body-sm">
            {facts.map(([label, value]) => (
              <div key={label} className="flex gap-1">
                <dt className="font-semibold">
                  {label}
                  {colon}
                </dt>
                <dd className="tabular-nums">{value}</dd>
              </div>
            ))}
            {hit.callNumber ? (
              <div className="flex items-center gap-1">
                <dt className="flex items-center gap-1 font-semibold">
                  <MapPin aria-hidden="true" className="size-3.5 text-accent" />
                  {c.callNumber}
                  {colon}
                </dt>
                <dd className="font-mono">{hit.callNumber}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}
        <div className="mt-auto flex flex-wrap items-center gap-3 pt-1">
          {hit.holdings.length > 0 ? (
            <LocateButton recordId={hit.id} title={hit.title} holdings={hit.holdings} messages={messages} locale={locale} />
          ) : null}
          {canReserve(hit) ? <Reserve hit={hit} context={context} /> : null}
          <Availability totalItems={hit.totalItems} availableItems={hit.availableItems} messages={messages} />
          <span className="ml-auto">
            <Like hit={hit} context={context} />
          </span>
        </div>
      </div>
    </article>
  );
}

/**
 * The phone card, kept as bare as an Instagram post (CDI request): the cover
 * with the same ribbon as on the desktop card; the title; "En savoir plus",
 * which opens the authors, the summary and the availability in place; and
 * beneath them the heart with its count, the paper plane and the reservation.
 */
function PostCard({ hit, eager, context }: { hit: SearchHit; eager: boolean; context: CardContext }) {
  const { messages, locale } = context;
  const c = messages.catalogue;
  return (
    <article className="group/card overflow-hidden rounded-card border border-border bg-surface shadow-card sm:hidden">
      <div className="relative">
        <Link
          href={`/catalogue/${hit.id}`}
          tabIndex={-1}
          aria-hidden="true"
          className="relative block aspect-[4/5] overflow-hidden"
        >
          <Cover hit={hit} eager={eager} sizes="90vw" />
        </Link>
        <Ribbon documentType={hit.documentType} genre={hit.genre} locale={locale} variant="large" />
      </div>
      {/* Title and "En savoir plus" first, then the row of icons beneath
          them (CDI request, after trying them under the cover). */}
      <div className="stack gap-1 px-2 pb-2 pt-3">
        <div className="stack gap-1 px-2">
          <h2 className="font-heading text-heading-3 leading-tight">
            <Link
              href={`/catalogue/${hit.id}`}
              className="rounded-control outline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
            >
              {hit.title}
            </Link>
          </h2>
          <details className="details-smooth group/more">
            <summary className="flex min-h-11 w-fit cursor-pointer list-none items-center gap-1 rounded-control text-body-sm font-semibold text-accent outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
              {c.moreInfo}
              <ChevronDown
                aria-hidden="true"
                className="size-4 transition-transform group-open/more:rotate-180 motion-reduce:transition-none"
              />
            </summary>
            <div className="stack gap-2 pb-1">
              <AuthorLinks authors={hit.authors} className="text-body-sm font-semibold text-accent" messages={messages} />
              {hit.abstract ? <p className="text-body-sm text-foreground-muted">{hit.abstract}</p> : null}
              <Availability totalItems={hit.totalItems} availableItems={hit.availableItems} messages={messages} />
            </div>
          </details>
        </div>
        <div className="flex items-center gap-1 border-t border-border pt-1">
          <Like hit={hit} context={context} large />
          <ShareButton recordId={hit.id} title={hit.title} messages={messages} />
          <span className="flex-1" />
          {canReserve(hit) ? <Reserve hit={hit} context={context} icon /> : null}
        </div>
      </div>
    </article>
  );
}

/** One result in the detailed view: the desktop card or the phone post, by width. */
export function DetailedResult({ hit, eager, context }: { hit: SearchHit; eager: boolean; context: CardContext }) {
  return (
    <>
      <DetailedCard hit={hit} eager={eager} context={context} />
      <PostCard hit={hit} eager={eager} context={context} />
    </>
  );
}

/** "Label : value" as the reference list prints it: the label in bold teal. */
function Labelled({ label, colon, children }: { label: string; colon: string; children: React.ReactNode }) {
  return (
    <span>
      <span className="font-semibold text-accent">
        {label}
        {colon}
      </span>{" "}
      {children}
    </span>
  );
}

/** Joins the pieces with a light vertical bar, skipping the empty ones. */
function Piped({ children }: { children: React.ReactNode[] }) {
  const parts = children.filter(Boolean);
  return (
    <p className="text-body-sm leading-relaxed">
      {parts.map((part, index) => (
        <span key={index}>
          {index > 0 ? <span aria-hidden="true" className="px-1.5 text-foreground-muted">|</span> : null}
          {part}
        </span>
      ))}
    </p>
  );
}

/**
 * The list view, after the CDI's reference: each record as a few dense
 * lines — title, type, genre, year, language, authors and publisher; the
 * collation; call number, ISBN and EAN; the copies — for scanning a long
 * result set the way a librarian reads a catalogue. No cover, by design.
 *
 * The whole row is the link to the book (CDI request), and greets the
 * pointer with a quick zoom-and-tilt that settles back (`animate-nudge`).
 */
export function ListResult({ hit, context }: { hit: SearchHit; context: CardContext }) {
  const { messages, locale } = context;
  const c = messages.catalogue;
  const colon = locale === "fr" ? " :" : ":";
  const genre = hit.genre ? (locale === "en" ? (hit.genre.labelEn ?? hit.genre.labelFr) : hit.genre.labelFr) : null;
  const ean = eanOf(hit.standardNumber);
  return (
    <Link
      href={`/catalogue/${hit.id}`}
      className="group stack gap-1.5 rounded-card border border-border bg-surface px-4 py-3 outline-offset-2 transition-colors hover:border-accent hover:shadow-popover hover:animate-nudge focus-visible:outline-2 focus-visible:outline-ring focus-visible:animate-nudge motion-reduce:hover:animate-none motion-reduce:focus-visible:animate-none"
    >
      <Piped>
        {[
          <span key="title" className="font-semibold group-hover:underline">
            {hit.title}
          </span>,
          hit.documentType ? <span key="type" className="font-semibold text-accent">{hit.documentType}</span> : null,
          genre ? <span key="genre" className="font-semibold text-accent">{genre}</span> : null,
          hit.publicationYear ? <span key="year" className="font-semibold text-accent">{hit.publicationYear}</span> : null,
          hit.languages.length ? (
            <span key="lang" className="font-semibold text-accent">
              {hit.languages.map((code) => languageName(code, locale)).join(", ")}
            </span>
          ) : null,
          hit.authors.length ? (
            <Labelled key="authors" label={c.authors} colon={colon}>
              {hit.authors.map((author) => author.name).join(" / ")}
            </Labelled>
          ) : null,
          hit.publisher ? (
            <Labelled key="publisher" label={c.publisher} colon={colon}>
              {hit.publisher}
            </Labelled>
          ) : null,
        ]}
      </Piped>
      {hit.pageCount ? (
        <p className="text-body-sm">
          <Labelled label={c.collation} colon={colon}>
            {hit.pageCount}
          </Labelled>
        </p>
      ) : null}
      {hit.callNumber || hit.standardNumber ? (
        <Piped>
          {[
            hit.callNumber ? (
              <Labelled key="call" label={c.callNumber} colon={colon}>
                <span className="font-mono">{hit.callNumber}</span>
              </Labelled>
            ) : null,
            hit.standardNumber ? (
              <Labelled key="isbn" label={c.isbn} colon={colon}>
                <span className="tabular-nums">{hit.standardNumber}</span>
              </Labelled>
            ) : null,
            ean ? (
              <Labelled key="ean" label={c.ean} colon={colon}>
                <span className="tabular-nums">{ean}</span>
              </Labelled>
            ) : null,
          ]}
        </Piped>
      ) : null}
      <p className="flex flex-wrap items-center gap-x-3 text-body-sm">
        <span>{fill(c.copies, { count: String(hit.totalItems) })}</span>
        {hit.totalItems > 0 ? (
          <Availability totalItems={hit.totalItems} availableItems={hit.availableItems} messages={messages} />
        ) : null}
      </p>
    </Link>
  );
}
