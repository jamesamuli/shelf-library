import Link from "next/link";
import {
  ArrowRight,
  BookImage,
  BookOpen,
  BookText,
  Drama,
  Feather,
  Library,
  MessagesSquare,
  Newspaper,
  WandSparkles,
  type LucideIcon,
} from "lucide-react";
import type { Genre } from "@/lib/catalogue";

/**
 * `genres.icon` and `genres.colour` are keys into these closed sets rather
 * than raw values, so a genre edited in the database can never inject markup
 * or an off-palette colour. Class names are spelled out in full because
 * Tailwind only generates the ones it can find in source.
 */
const ICONS: Record<string, LucideIcon> = {
  speech: MessagesSquare,
  book: BookText,
  "picture-book": BookImage,
  wand: WandSparkles,
  masks: Drama,
  feather: Feather,
  "open-book": BookOpen,
  newspaper: Newspaper,
};

const COLOURS: Record<string, { fill: string; edge: string }> = {
  indigo: { fill: "bg-genre-indigo", edge: "border-genre-indigo" },
  teal: { fill: "bg-genre-teal", edge: "border-genre-teal" },
  forest: { fill: "bg-genre-forest", edge: "border-genre-forest" },
  terracotta: { fill: "bg-genre-terracotta", edge: "border-genre-terracotta" },
  raspberry: { fill: "bg-genre-raspberry", edge: "border-genre-raspberry" },
  violet: { fill: "bg-genre-violet", edge: "border-genre-violet" },
  ochre: { fill: "bg-genre-ochre", edge: "border-genre-ochre" },
  plum: { fill: "bg-genre-plum", edge: "border-genre-plum" },
};

/** A genre's icon and colour classes, falling back for unknown keys. */
export function genreStyle(icon: string, colour: string) {
  return { Icon: ICONS[icon] ?? BookOpen, ...(COLOURS[colour] ?? COLOURS.indigo) };
}

export function GenreTile({ genre }: { genre: Genre }) {
  const { Icon, ...colour } = genreStyle(genre.icon, genre.colour);

  // Colour lives in the icon block and border only; the label stays on the
  // plain surface (CDI request), so hover lifts the tile instead of tinting it.
  return (
    <Link
      href={`/catalogue?genre=${encodeURIComponent(genre.slug)}`}
      className={`group flex min-h-14 items-stretch overflow-hidden rounded-card border-2 bg-surface outline-offset-2 transition-shadow hover:shadow-popover focus-visible:outline-2 focus-visible:outline-ring ${colour.edge}`}
    >
      <span className={`grid w-12 shrink-0 place-items-center text-white sm:w-14 ${colour.fill}`}>
        <Icon aria-hidden="true" className="size-6" strokeWidth={2} />
      </span>
      <span className="flex flex-1 items-center px-3 py-2 text-body-sm font-semibold underline-offset-2 group-hover:underline">
        {genre.label}
      </span>
    </Link>
  );
}

/**
 * The last line of Découvrir, the whole row's width: every book, no filter
 * (CDI request). Dressed like the carousel's "Voir plus" tile — dashed teal
 * border on the plain surface, its arrow in a filled circle — with a teal
 * icon rather than a filled block, so it reads apart from the genres.
 */
function WholeCatalogueTile({ label, hint }: { label: string; hint: string }) {
  return (
    <Link
      href="/catalogue?q="
      className="group flex min-h-16 items-stretch overflow-hidden rounded-card border-3 border-dashed border-accent bg-surface shadow-card outline-offset-2 transition-shadow duration-300 hover:shadow-popover focus-visible:outline-2 focus-visible:outline-ring"
    >
      <span className="grid w-12 shrink-0 place-items-center text-accent sm:w-14">
        <Library aria-hidden="true" className="size-7" strokeWidth={2} />
      </span>
      <span className="stack flex-1 justify-center py-2 pr-3">
        <span className="text-body-sm font-semibold underline-offset-2 group-hover:underline">{label}</span>
        <span className="text-caption text-foreground-muted">{hint}</span>
      </span>
      <span aria-hidden="true" className="grid place-items-center pr-3">
        <span className="grid size-10 place-items-center rounded-full bg-accent text-primary-foreground transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none">
          <ArrowRight className="size-5" strokeWidth={2.5} />
        </span>
      </span>
    </Link>
  );
}

/**
 * The genre tiles as a list: the home's "Découvrir" panel and the phone
 * sheet, both ending with the whole catalogue (CDI request).
 */
export function GenreList({ genres, all }: { genres: Genre[]; all: { label: string; hint: string } }) {
  return (
    <ul className="grid gap-2 min-[26rem]:grid-cols-2 sm:gap-3">
      {genres.map((genre) => (
        <li key={genre.slug} className="grid">
          <GenreTile genre={genre} />
        </li>
      ))}
      <li className="grid col-span-full">
        <WholeCatalogueTile label={all.label} hint={all.hint} />
      </li>
    </ul>
  );
}
