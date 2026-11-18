import { Search } from "lucide-react";
import type { Messages } from "@/lib/i18n";

/**
 * A plain GET form, so a search is a real URL: shareable, bookmarkable,
 * back-button friendly, and working without JavaScript. Legacy posted the
 * search and kept state in the PHP session, which made results unlinkable.
 */
export function SearchBar({
  messages,
  defaultValue,
  genre,
  id = "catalogue-q",
}: {
  messages: Messages;
  defaultValue?: string;
  /** Unique per page: the home renders the form twice (page and phone sheet). */
  id?: string;
  /** Keeps a genre filter on while the reader refines with keywords. */
  genre?: string;
}) {
  return (
    <form action="/catalogue" method="get" role="search" className="w-full">
      {genre ? <input type="hidden" name="genre" value={genre} /> : null}
      <label htmlFor={id} className="sr-only">
        {messages.catalogue.searchLabel}
      </label>
      {/* On phones the button goes full width under the field, rather than
          squeezing the field to a few letters of its placeholder. */}
      <div className="cluster gap-2">
        <div className="relative min-w-0 flex-1 max-sm:basis-full">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-foreground-subtle">
            <Search aria-hidden="true" className="size-5" strokeWidth={1.75} />
          </span>
          <input
            id={id}
            type="search"
            name="q"
            defaultValue={defaultValue}
            placeholder={messages.catalogue.searchPlaceholder}
            enterKeyHint="search"
            className="w-full rounded-control border border-border bg-surface py-3 pl-10 pr-3 text-body text-foreground placeholder:text-foreground-subtle outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring"
          />
        </div>
        <button
          type="submit"
          className="min-h-11 rounded-control bg-primary px-5 max-sm:w-full text-body-sm font-medium text-primary-foreground outline-offset-2 hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-ring"
        >
          {messages.catalogue.searchAction}
        </button>
      </div>
    </form>
  );
}

/**
 * The search form with its tips: the home's search panel and the phone sheet.
 * Rendered twice on one page there, so each copy gets its own field id.
 */
export function SearchPanel({ messages, id }: { messages: Messages; id: string }) {
  const c = messages.catalogue;
  return (
    <>
      <SearchBar messages={messages} id={id} />
      <div className="stack gap-2 rounded-control bg-primary p-4 text-primary-foreground">
        <h3 className="text-body-sm font-semibold">{c.searchTipsTitle}</h3>
        <ul className="stack gap-1.5 text-body-sm">
          {c.searchTips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </div>
    </>
  );
}
