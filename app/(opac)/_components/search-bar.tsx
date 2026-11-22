import { Search } from "lucide-react";
import type { Messages } from "@/lib/i18n";

/**
 * A plain GET form, so a search is a real URL: shareable, bookmarkable,
 * back-button friendly, and working without JavaScript. Legacy posted the
 * search and kept state in the PHP session, which made results unlinkable.
 *
 * The phone's search sheet passes `onSubmit` to show the results in place;
 * without JavaScript the form still goes to the results page.
 */
export function SearchBar({
  messages,
  defaultValue,
  keep = {},
  id = "catalogue-q",
  onSubmit,
  onChange,
}: {
  messages: Messages;
  defaultValue?: string;
  /** Unique per page: the home renders the form twice (page and phone sheet). */
  id?: string;
  /** Filters, sort and view kept on while the reader refines with keywords. */
  keep?: Record<string, string>;
  onSubmit?: (event: React.FormEvent<HTMLFormElement>) => void;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <form action="/catalogue" method="get" role="search" onSubmit={onSubmit} className="w-full">
      {Object.entries(keep).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
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
          onChange={onChange}
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
