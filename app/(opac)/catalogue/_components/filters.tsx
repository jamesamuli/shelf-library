import Link from "next/link";
import { Check, ChevronDown, type LucideIcon } from "lucide-react";
import { LANGUAGES, type DocumentTypeOption, type Facets, type Genre, type Language } from "@/lib/catalogue";
import type { Locale } from "@/lib/preferences";
import { languageName } from "../_lib/language";
import { fill as fillIn, type Messages } from "@/lib/i18n";
import { genreStyle } from "../../_components/genre-tile";
import { LinkLoader } from "../../_components/route-loader";

/**
 * Document types are free labels typed in Gestion, so their icon and colour
 * are matched on the label, echoing the genre of the same name (comics in
 * the comics indigo, magazines in plum), with a plain book otherwise.
 */
const TYPE_STYLES: { match: RegExp; icon: string; colour: string }[] = [
  { match: /bande|bd|comic|manga/i, icon: "speech", colour: "indigo" },
  { match: /album|picture/i, icon: "picture-book", colour: "forest" },
  { match: /revue|magazine|périodique|journal/i, icon: "newspaper", colour: "plum" },
];

export function documentTypeStyle(label: string) {
  const style = TYPE_STYLES.find((candidate) => candidate.match.test(label));
  return genreStyle(style?.icon ?? "open-book", style?.colour ?? "teal");
}

/**
 * How many results an option would give (CDI request): the number at a
 * glance, the words for screen readers. Nothing when counts are unknown.
 */
function Count({ count, messages }: { count: number | undefined; messages: Messages }) {
  if (count === undefined) return null;
  return (
    <>
      <span aria-hidden="true" className="text-caption font-medium tabular-nums text-foreground-muted">
        {count}
      </span>
      <span className="sr-only">({fillIn(messages.catalogue.facetCount, { count: String(count) })})</span>
    </>
  );
}

/**
 * One filter, as a tile in the Découvrir style: coloured icon block, plain
 * label, and the number of results it would give. A chosen tile is filled
 * with a tint of its colour and ticked; choosing it again lifts the filter.
 * Links, not checkboxes: each state is a URL, so a filtered list can be
 * shared and works without JavaScript. An option that would give nothing is
 * dimmed and not a link: there is nowhere useful for it to go.
 */
function FilterTile({
  href,
  label,
  active,
  count,
  messages,
  Icon,
  fill,
  edge,
}: {
  href: string;
  label: string;
  active: boolean;
  count: number | undefined;
  messages: Messages;
  Icon: LucideIcon;
  fill: string;
  edge: string;
}) {
  const inner = (
    <>
      <span className={`grid w-11 shrink-0 place-items-center text-white ${fill}`}>
        <Icon aria-hidden="true" className="size-5" strokeWidth={2} />
      </span>
      <span className="flex flex-1 items-center gap-2 px-3 py-2 text-body-sm font-semibold underline-offset-2 group-hover:underline">
        <span className="flex-1">{label}</span>
        {active ? <Check aria-hidden="true" className="size-4 shrink-0 text-accent" strokeWidth={3} /> : null}
        <Count count={count} messages={messages} />
      </span>
    </>
  );
  const frame = `flex min-h-12 items-stretch overflow-hidden rounded-card border-2 ${edge}`;
  if (count === 0 && !active) {
    return (
      <span aria-disabled="true" className={`${frame} bg-surface opacity-45 grayscale`}>
        {inner}
      </span>
    );
  }
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      scroll={false}
      className={`group ${frame} outline-offset-2 transition-shadow hover:shadow-popover focus-visible:outline-2 focus-visible:outline-ring ${active ? "bg-surface-muted shadow-popover" : "bg-surface"}`}
    >
      {inner}
      <LinkLoader />
    </Link>
  );
}

/**
 * The filters: Support (document types) and Langue as short lists, and
 * Genre — the longest — folded into a disclosure that opens and closes (CDI
 * request), open from the start when a genre is chosen. Used down the left
 * on wide screens and inside the "Filtres" panel below `lg`.
 */
export function Filters({
  types,
  genres,
  activeType,
  activeGenre,
  activeLanguage,
  typeHref,
  genreHref,
  languageHref,
  availableOnly,
  availableHref,
  facets,
  messages,
  locale,
}: {
  types: DocumentTypeOption[];
  genres: Genre[];
  activeType: number | null;
  activeGenre: string | null;
  activeLanguage: Language | null;
  /** The URL with this type chosen, or the filter lifted when null. */
  typeHref: (id: number | null) => string;
  genreHref: (slug: string | null) => string;
  languageHref: (language: Language | null) => string;
  availableOnly: boolean;
  /** The URL with "available now" switched the other way. */
  availableHref: string;
  /** How many results each option would give; unknown when null. */
  facets: Facets | null;
  messages: Messages;
  locale: Locale;
}) {
  const c = messages.catalogue;
  const chosenGenre = genres.find((genre) => genre.slug === activeGenre);
  // Two columns of tiles only where the panel itself is wide enough (a
  // container query), so the narrow aside on desktop keeps one.
  return (
    <div className="@container stack gap-content">
      {/* First, as it is often the reader's first question (CDI request):
          only what can be borrowed right now. A switch in look; a link, as
          every filter, so the state is a URL. */}
      <section aria-labelledby="filter-availability" className="stack gap-3">
        <h3 id="filter-availability" className="font-heading text-body font-semibold">
          {c.filterAvailability}
        </h3>
        <Link
          href={availableHref}
          aria-current={availableOnly ? "true" : undefined}
          scroll={false}
          className={`group flex min-h-12 items-center gap-3 rounded-card border-2 px-3 py-2 outline-offset-2 transition-[box-shadow,border-color] hover:shadow-popover focus-visible:outline-2 focus-visible:outline-ring ${
            availableOnly ? "border-success bg-surface-muted shadow-popover" : "border-border-strong bg-surface"
          }`}
        >
          <span
            aria-hidden="true"
            className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${availableOnly ? "bg-success" : "bg-border-strong"}`}
          >
            <span
              className={`absolute top-0.5 size-5 rounded-full bg-white shadow-card transition-[left] motion-reduce:transition-none ${
                availableOnly ? "left-[1.125rem]" : "left-0.5"
              }`}
            />
          </span>
          <span className="stack flex-1">
            <span className="text-body-sm font-semibold underline-offset-2 group-hover:underline">{c.availableNow}</span>
            <span className="text-caption text-foreground-muted">{c.availableNowHint}</span>
          </span>
          <Count count={facets?.available} messages={messages} />
          <LinkLoader />
        </Link>
      </section>

      {types.length > 1 ? (
        <section aria-labelledby="filter-format" className="stack gap-3">
          <h3 id="filter-format" className="font-heading text-body font-semibold">
            {c.filterFormat}
          </h3>
          <ul className="grid gap-2 @md:grid-cols-2">
            {types.map((type) => {
              const active = type.id === activeType;
              return (
                <li key={type.id} className="grid">
                  <FilterTile
                    href={typeHref(active ? null : type.id)}
                    label={type.label}
                    active={active}
                    count={facets ? (facets.types[type.id] ?? 0) : undefined}
                    messages={messages}
                    {...documentTypeStyle(type.label)}
                  />
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <details open={chosenGenre !== undefined} className="details-smooth group/genre stack gap-3">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-control font-heading text-body font-semibold outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
          <span className="flex-1">
            {c.filterGenre}
            {chosenGenre ? <span className="font-sans text-body-sm font-normal text-accent"> · {chosenGenre.label}</span> : null}
          </span>
          <ChevronDown
            aria-hidden="true"
            className="size-5 text-accent transition-transform group-open/genre:rotate-180 motion-reduce:transition-none"
          />
        </summary>
        <ul className="mt-2 grid gap-2 pb-1 @md:grid-cols-2">
          {genres.map((genre) => {
            const active = genre.slug === activeGenre;
            return (
              <li key={genre.slug} className="grid">
                <FilterTile
                  href={genreHref(active ? null : genre.slug)}
                  label={genre.label}
                  active={active}
                  count={facets ? (facets.genres[genre.slug] ?? 0) : undefined}
                  messages={messages}
                  {...genreStyle(genre.icon, genre.colour)}
                />
              </li>
            );
          })}
        </ul>
      </details>

      <section aria-labelledby="filter-language" className="stack gap-3">
        <h3 id="filter-language" className="font-heading text-body font-semibold">
          {c.filterLanguage}
        </h3>
        <ul className="flex flex-wrap gap-2">
          {LANGUAGES.map((language) => {
            const active = language === activeLanguage;
            const count = facets ? (facets.languages[language] ?? 0) : undefined;
            if (count === 0 && !active) {
              return (
                <li key={language}>
                  <span
                    aria-disabled="true"
                    className="flex min-h-11 items-center gap-1.5 rounded-full border-2 border-border bg-surface px-4 text-body-sm font-semibold text-foreground opacity-45"
                  >
                    {languageName(language, locale)}
                    <Count count={count} messages={messages} />
                  </span>
                </li>
              );
            }
            return (
              <li key={language}>
                <Link
                  href={languageHref(active ? null : language)}
                  aria-current={active ? "true" : undefined}
                  scroll={false}
                  className={`flex min-h-11 items-center gap-1.5 rounded-full border-2 px-4 text-body-sm font-semibold outline-offset-2 transition-colors focus-visible:outline-2 focus-visible:outline-ring ${
                    active
                      ? "border-accent bg-accent text-primary-foreground"
                      : "border-border-strong bg-surface text-foreground hover:border-accent"
                  }`}
                >
                  {active ? <Check aria-hidden="true" className="size-4" strokeWidth={3} /> : null}
                  {languageName(language, locale)}
                  <Count count={count} messages={messages} />
                  <LinkLoader />
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
