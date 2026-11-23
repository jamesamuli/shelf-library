"use client";

import { ChevronDown } from "lucide-react";
import type { Sort } from "@/lib/catalogue";

/**
 * A GET form like the search, so the sorted list is a URL. Choosing an
 * option submits it at once; without JavaScript, the button does.
 */
export function SortSelect({
  label,
  applyLabel,
  options,
  value,
  keep,
}: {
  label: string;
  applyLabel: string;
  options: { value: Sort; label: string }[];
  value: Sort;
  /** The query, filters and view, carried over; the page goes back to 1. */
  keep: Record<string, string>;
}) {
  return (
    <form action="/catalogue" method="get" className="flex min-w-0 items-center justify-end gap-2">
      {Object.entries(keep).map(([name, kept]) => (
        <input key={name} type="hidden" name={name} value={kept} />
      ))}
      <label htmlFor="catalogue-sort" className="text-body-sm text-foreground-muted max-sm:sr-only">
        {label}
      </label>
      <span className="relative min-w-0">
        <select
          id="catalogue-sort"
          name="tri"
          defaultValue={value}
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
          className="min-h-11 w-full max-w-60 truncate appearance-none max-sm:max-w-40 rounded-control border border-border-strong bg-surface py-2 pl-3 pr-9 text-body-sm text-foreground outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-accent"
        />
      </span>
      <noscript>
        <button
          type="submit"
          className="min-h-11 rounded-control border border-border-strong px-3 text-body-sm"
        >
          {applyLabel}
        </button>
      </noscript>
    </form>
  );
}
