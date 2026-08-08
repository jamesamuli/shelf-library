import type { Messages } from "@/lib/i18n";

/**
 * A plain GET form, so a search is a real URL: shareable, bookmarkable,
 * back-button friendly, and working without JavaScript. Legacy posted the
 * search and kept state in the PHP session, which made results unlinkable.
 */
export function SearchBar({
  messages,
  defaultValue,
}: {
  messages: Messages;
  defaultValue?: string;
}) {
  return (
    <form action="/catalogue" method="get" role="search" className="w-full">
      <label htmlFor="catalogue-q" className="sr-only">
        {messages.catalogue.searchLabel}
      </label>
      <div className="cluster gap-2">
        <div className="relative min-w-0 flex-1">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-foreground-subtle">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              className="size-5"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" strokeLinecap="round" />
            </svg>
          </span>
          <input
            id="catalogue-q"
            type="search"
            name="q"
            defaultValue={defaultValue}
            placeholder={messages.catalogue.searchPlaceholder}
            className="w-full rounded-control border border-border bg-surface py-3 pl-10 pr-3 text-body text-foreground placeholder:text-foreground-subtle outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring"
          />
        </div>
        <button
          type="submit"
          className="min-h-11 rounded-control bg-primary px-5 text-body-sm font-medium text-primary-foreground outline-offset-2 hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-ring"
        >
          {messages.catalogue.searchAction}
        </button>
      </div>
    </form>
  );
}
