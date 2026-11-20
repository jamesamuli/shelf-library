import Link from "next/link";
import { BookOpen, Check, Clock, Minus } from "lucide-react";
import { ShelfMark } from "@/app/_components/shelf-mark";
import { fill, type Messages } from "@/lib/i18n";
import type { Locale } from "@/lib/preferences";
import { getNewArrivals, listGenres, type NewArrival } from "@/lib/catalogue";
import { Carousel } from "./carousel";
import { CoverImage } from "./cover-image";
import { FallingBooks } from "./falling-books";
import { GenreList } from "./genre-tile";
import { PracticalInfo } from "./practical-info";
import { SearchBar } from "./search-bar";

const NEW_ARRIVALS = 12;

/**
 * The cover sits on top of a Shelf-branded stand-in. While the cover is
 * loading, when there is none, or when Open Library answers with its blank
 * image, the stand-in shows through, so no card is ever an empty grey box.
 */
function Cover({
  arrival,
  availability,
  eager,
}: {
  arrival: NewArrival;
  availability: string;
  eager: boolean;
}) {
  return (
    // On phones the card fills the screen and the cover takes whatever height
    // is left above the author line, rather than a fixed 2:3.
    <div className="relative aspect-[2/3] overflow-hidden bg-surface-muted max-sm:aspect-auto max-sm:min-h-0 max-sm:flex-1">
      {/* The card's only title, with the availability count beneath it: it
          slides up over the cover on hover or keyboard focus, so the resting
          card is all picture (CDI request). Devices that cannot hover show it
          permanently, or a touch reader would never learn what the book is.
          Translated off-screen, it is still in the link's text, so screen
          readers always announce it — and first, which is why it leads the
          DOM; z-10 keeps it painted above the cover that follows.
          `primary-foreground` rather than white: white on the lighter dark-
          theme teal is only 3:1. */}
      {/* Shown for good on touch screens and held to two lines there, so it
          labels the cover rather than hiding it; on tablets, whose cards are
          small, it is also set smaller. A phone's single full-width card
          keeps the full size. */}
      <span className="absolute inset-x-0 bottom-0 z-10 stack translate-y-full gap-1 bg-accent p-3 text-primary-foreground transition-transform duration-300 ease-out group-hover:translate-y-0 group-focus-visible:translate-y-0 motion-reduce:transition-none [@media(hover:none)]:translate-y-0 sm:[@media(hover:none)]:gap-0.5 sm:[@media(hover:none)]:p-2.5">
        <span className="font-heading text-heading-3 leading-tight [@media(hover:none)]:line-clamp-2 sm:[@media(hover:none)]:text-body sm:[@media(hover:none)]:font-semibold">
          {arrival.title}
        </span>{" "}
        <span className="text-body-sm font-medium sm:[@media(hover:none)]:text-caption">
          {availability}
        </span>
      </span>
      <div
        aria-hidden="true"
        className="absolute inset-0 stack items-center justify-center gap-3 p-4 text-center"
      >
        <ShelfMark className="w-3/5" />
        <span className="h-px w-8 bg-secondary" />
        <span className="line-clamp-3 font-heading text-body-sm font-semibold text-foreground-muted">
          {arrival.title}
        </span>
      </div>
      {arrival.coverUrl ? <CoverImage src={arrival.coverUrl} eager={eager} /> : null}
      {arrival.documentType ? <TypeRibbon label={arrival.documentType} /> : null}
    </div>
  );
}

/**
 * Document type as a ribbon off the cover's left edge, in the Shelf teal.
 * Books get the book icon alone — the type is named for screen readers and
 * on hover; any other type still spells out its label until it has an icon.
 */
function TypeRibbon({ label }: { label: string }) {
  const isBook = /livre|book/i.test(label);
  return (
    <span
      title={label}
      className="absolute left-0 top-3 z-10 flex items-center gap-1.5 rounded-r-control bg-accent px-2.5 py-1.5 text-caption text-primary-foreground shadow-card"
    >
      <BookOpen aria-hidden="true" className="size-4" strokeWidth={2.25} />
      {isBook ? <span className="sr-only">{label}</span> : label}
    </span>
  );
}

/**
 * Availability state for a card: a round badge beside the author, in Shelf
 * green when a copy is on the shelf, and the count, shown under the title on
 * hover (CDI request). The icon's shape carries the state as well as its
 * colour, for readers who cannot tell green from amber. On-loan and no-copy
 * states keep their own colours so the green always means "on the shelf".
 */
function availabilityOf(arrival: NewArrival, messages: Messages) {
  const c = messages.catalogue;
  if (arrival.totalItems === 0) {
    return { Icon: Minus, label: c.noHoldings, tone: "bg-foreground-muted text-background" };
  }
  if (arrival.availableItems === 0) {
    return { Icon: Clock, label: c.allOnLoan, tone: "bg-genre-ochre text-white" };
  }
  return {
    Icon: Check,
    label: fill(c.available, { count: String(arrival.availableItems) }),
    tone: "bg-accent text-primary-foreground",
  };
}

export async function CatalogueHome({
  messages,
  locale,
  isSubscriber,
}: {
  messages: Messages;
  locale: Locale;
  isSubscriber: boolean;
}) {
  const [arrivals, genres] = await Promise.all([
    getNewArrivals(NEW_ARRIVALS, isSubscriber),
    listGenres(locale),
  ]);
  const c = messages.catalogue;

  return (
    <div className="stack gap-section">
      {/* Out of the flow: it fills the catalogue layout, behind everything.
          The heading and the search bar are what the books bounce off, the
          new-arrivals panel what they land on (the data-book-* marks). */}
      <FallingBooks quotes={messages.quotes} />

      {/* Not shown on phones (CDI request), but kept for screen readers: a
          page still needs its main heading. */}
      <h1 className="stack text-balance text-center font-heading text-heading-2 max-sm:sr-only sm:text-display">
        {/* The hidden dash keeps the two lines apart in the heading's spoken
            name — "Bienvenue au CDI — École Française de Bujumbura". */}
        <span data-book-bump="text">{c.welcomeTitle}</span>
        <span className="sr-only"> — </span>
        {/* Capitals by CSS, not in the string: screen readers then say the
            name rather than risk spelling it out letter by letter. */}
        <span data-book-bump="text" className="uppercase text-accent">
          {c.welcomeSchool}
        </span>
      </h1>

      {/* Search right under the welcome on desktop (CDI request); phones
          search from the bottom bar. */}
      <div data-book-bump className="mx-auto w-full max-w-3xl max-sm:hidden">
        <SearchBar messages={messages} id="catalogue-q" />
      </div>

      {arrivals.length === 0 ? null : (
        // Phones: no panel chrome, and the screen's height between the header
        // and the bottom bar (header ~5.2rem, the page's top padding 2rem, the
        // bar 4rem, a little air), so one book holds the whole view (CDI
        // request). Never shorter than 28rem.
        <section
          data-book-floor
          aria-labelledby="new-arrivals"
          className="flex h-[max(28rem,calc(100svh-12.25rem))] flex-col sm:block sm:h-auto sm:rounded-panel sm:border sm:border-border sm:bg-surface-muted sm:p-6"
        >
          <Carousel
            heading={
              <h2 id="new-arrivals" className="font-heading text-heading-2">
                {c.newArrivals}
              </h2>
            }
            backLabel={c.scrollBack}
            forwardLabel={c.scrollForward}
          >
            {arrivals.map((arrival, index) => {
              const { Icon, label, tone } = availabilityOf(arrival, messages);
              return (
                // Phones: one book, full width, and a swipe moves exactly one
                // (snap-always stops a fling from skipping several).
                <li
                  key={arrival.id}
                  className="w-full shrink-0 snap-center snap-always max-sm:h-full sm:w-52 sm:snap-start sm:snap-normal"
                >
                  <Link
                    href={`/catalogue/${arrival.id}`}
                    className="group relative stack h-full overflow-hidden rounded-card border-3 border-transparent bg-surface shadow-card outline-offset-4 transition-[scale,border-color,box-shadow] duration-300 ease-out hover:z-10 hover:scale-[1.08] hover:border-accent hover:shadow-modal focus-visible:z-10 focus-visible:scale-[1.08] focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:focus-visible:scale-100"
                  >
                    <Cover arrival={arrival} availability={label} eager={index === 0} />
                    <span className="flex flex-1 items-center gap-2 px-3 py-2.5 max-sm:flex-none">
                      <span className="min-w-0 flex-1 truncate text-body-sm text-foreground-muted">
                        {arrival.authors.join(", ")}
                      </span>
                      {/* The count is already read with the title; the
                          badge is its at-a-glance echo, so it stays silent. */}
                      <span
                        aria-hidden="true"
                        className={`grid size-6 shrink-0 place-items-center rounded-full ${tone}`}
                      >
                        <Icon className="size-3.5" strokeWidth={3} />
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </Carousel>
        </section>
      )}

      {/* Découvrir beside the practical information, which took the search
          panel's place once search moved under the welcome (CDI request).
          The two are stretched to one height (CDI request). Phones reach
          Découvrir from the bottom bar, so only the practical information
          follows the carousel there. Without new arrivals, the books land
          here instead. */}
      <div data-book-floor className="grid gap-content md:grid-cols-2">
        {genres.length === 0 ? null : (
          <section
            aria-labelledby="discover"
            className="stack gap-content rounded-card border border-border bg-surface p-5 shadow-card max-sm:hidden sm:p-6"
          >
            <h2 id="discover" className="font-heading text-heading-2">
              {c.discover}
            </h2>
            <GenreList genres={genres} />
          </section>
        )}

        <PracticalInfo
          messages={messages}
          locale={locale}
          accountHref={isSubscriber ? "/catalogue/compte" : "/login/opac"}
        />
      </div>
    </div>
  );
}
