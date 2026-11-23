"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Messages } from "@/lib/i18n";
import { SearchBar } from "../../_components/search-bar";

/** Typing pauses this long before the list follows. */
const PAUSE_MS = 400;
/** Fewer letters than this match too much to be worth a request. */
const MIN_LETTERS = 3;

/**
 * The results page's search, updating the list as the reader types (CDI
 * request). Measured against cost, since every update is a page render (~4
 * database operations): the list follows only after a 400 ms pause, from 3
 * letters, and never twice for the same words — about as many renders per
 * search as pressing Enter, rather than one per keystroke. Enter still
 * searches at once, whatever the length.
 *
 * Updates replace the URL rather than add to history, so Back still leaves
 * the catalogue. Emptying the field — the field's own little cross included
 * — returns to the list the reader was on before this search, its filters,
 * sort and page as they were (CDI request).
 *
 * Without JavaScript it is the plain GET form.
 */
export function LiveSearch({
  messages,
  defaultValue,
  keep,
}: {
  messages: Messages;
  defaultValue: string;
  keep: Record<string, string>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const timer = useRef<number | undefined>(undefined);
  const last = useRef(defaultValue.trim());
  /** The list before the reader started typing, to come back to. */
  const before = useRef<string | null>(null);

  const show = (value: string, force = false) => {
    const words = value.trim();
    if (words === last.current) return;
    if (!words) {
      const target = new URL(before.current ?? window.location.href, window.location.origin);
      // Arrived with words already (a search from the home): there is no
      // earlier list on this page, so the whole catalogue, filters kept.
      if (target.searchParams.get("q")) {
        target.searchParams.set("q", "");
        target.searchParams.delete("page");
      }
      before.current = null;
      last.current = "";
      startTransition(() => router.replace(target.pathname + target.search, { scroll: false }));
      return;
    }
    if (!force && words.length < MIN_LETTERS) return;
    before.current ??= window.location.pathname + window.location.search;
    last.current = words;
    const params = new URLSearchParams(window.location.search);
    params.set("q", words);
    params.delete("page");
    startTransition(() => router.replace(`/catalogue?${params}`, { scroll: false }));
  };

  return (
    <div className="relative" aria-busy={pending || undefined}>
      <SearchBar
        messages={messages}
        defaultValue={defaultValue}
        keep={keep}
        onSubmit={(event) => {
          event.preventDefault();
          window.clearTimeout(timer.current);
          show(String(new FormData(event.currentTarget).get("q") ?? ""), true);
        }}
        onChange={(event) => {
          const value = event.currentTarget.value;
          window.clearTimeout(timer.current);
          if (!value.trim()) show("");
          else timer.current = window.setTimeout(() => show(value), PAUSE_MS);
        }}
      />
      {/* Inside the field, by the search button, rather than on a line of
          its own that the compact header would keep empty most of the time. */}
      <p role="status" className="sr-only">
        {pending ? messages.catalogue.searching : ""}
      </p>
      {pending ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-16 top-1/2 -translate-y-1/2 rounded-control bg-surface px-1.5 text-caption text-foreground-muted"
        >
          {messages.catalogue.searching}
        </span>
      ) : null}
    </div>
  );
}
