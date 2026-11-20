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
      {/* The field and an icon button joined into one control (CDI request);
          the row stretches the button to the field's height. The button is
          named for screen readers, and the field keeps its whole width on a
          phone. */}
      <div className="flex">
        <input
          id={id}
          type="search"
          name="q"
          defaultValue={defaultValue}
          placeholder={messages.catalogue.searchPlaceholder}
          enterKeyHint="search"
          className="min-w-0 flex-1 rounded-l-control border border-r-0 border-border bg-surface px-4 py-3 text-body text-foreground placeholder:text-foreground-subtle outline-offset-2 focus-visible:relative focus-visible:outline-2 focus-visible:outline-ring"
        />
        <button
          type="submit"
          aria-label={messages.catalogue.searchAction}
          title={messages.catalogue.searchAction}
          className="grid shrink-0 place-items-center rounded-r-control bg-primary px-4 text-primary-foreground outline-offset-2 hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-ring"
        >
          <Search aria-hidden="true" className="size-5" strokeWidth={2.25} />
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
