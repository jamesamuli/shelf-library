"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { ShelfMark } from "@/app/_components/shelf-mark";
import { fill, type Messages } from "@/lib/i18n";
import { sheetSearchAction } from "../catalogue/_actions";
import type { SheetHit } from "../catalogue/_lib/state";
import { Availability } from "./availability";
import { CoverImage } from "./cover-image";
import { SearchBar } from "./search-bar";

type Found = { query: string; hits: SheetHit[]; total: number };

/** As on the results page: a pause, then only from three letters. */
const PAUSE_MS = 400;
const MIN_LETTERS = 3;

/**
 * The phone's search sheet (CDI request). The results appear in the sheet,
 * where the tips were, and scroll there; a tap on a book opens it (and the
 * dock closes the sheet). Nothing reloads and nothing is lost: closing and
 * reopening the sheet finds the same results, as does coming back from the
 * book. Emptying the field brings the tips back.
 *
 * The results follow the typing — after a 400 ms pause, from three letters,
 * never twice for the same words (2 database operations each) — and Enter
 * searches at once. A late answer to older words is dropped.
 *
 * Without JavaScript the form still goes to the results page.
 */
export function SearchSheet({ messages, id }: { messages: Messages; id: string }) {
  const c = messages.catalogue;
  const [found, setFound] = useState<Found | null>(null);
  const [pending, startTransition] = useTransition();
  const timer = useRef<number | undefined>(undefined);
  const latest = useRef("");

  const run = (value: string, force = false) => {
    const query = value.trim();
    if (!query) {
      latest.current = "";
      setFound(null);
      return;
    }
    if ((!force && query.length < MIN_LETTERS) || query === latest.current) return;
    latest.current = query;
    startTransition(async () => {
      const result = await sheetSearchAction(query);
      if (latest.current === query) setFound({ query, ...result });
    });
  };

  return (
    <>
      <SearchBar
        messages={messages}
        id={id}
        onSubmit={(event) => {
          event.preventDefault();
          window.clearTimeout(timer.current);
          run(String(new FormData(event.currentTarget).get("q") ?? ""), true);
        }}
        onChange={(event) => {
          const value = event.currentTarget.value;
          window.clearTimeout(timer.current);
          if (!value.trim()) run("");
          else timer.current = window.setTimeout(() => run(value), PAUSE_MS);
        }}
      />

      {pending ? (
        <p role="status" className="text-body-sm text-foreground-muted">
          {c.searching}
        </p>
      ) : found === null ? (
        <div className="stack gap-2 rounded-control bg-primary p-4 text-primary-foreground">
          <h3 className="text-body-sm font-semibold">{c.searchTipsTitle}</h3>
          <ul className="stack gap-1.5 text-body-sm">
            {c.searchTips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </div>
      ) : (
        <section aria-label={c.resultsTitle} className="stack gap-3">
          <p role="status" className="text-body-sm text-foreground-muted">
            {fill(c.resultsCount, { count: String(found.total) })} {fill(c.resultsFor, { query: found.query })}
          </p>
          {found.hits.length === 0 ? (
            <p className="text-body-sm">{c.noResultsHint}</p>
          ) : (
            <ul className="stack gap-2">
              {found.hits.map((hit) => (
                <li key={hit.id}>
                  <Link
                    href={`/catalogue/${hit.id}`}
                    className="flex items-center gap-3 rounded-card border border-border bg-surface p-2 outline-offset-2 active:bg-surface-muted focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <span className="relative block aspect-[2/3] w-12 shrink-0 overflow-hidden rounded-control bg-surface-muted">
                      <span aria-hidden="true" className="absolute inset-0 grid place-items-center p-1.5">
                        <ShelfMark className="w-full" />
                      </span>
                      {hit.coverUrl ? <CoverImage src={hit.coverUrl} sizes="3rem" /> : null}
                    </span>
                    <span className="stack min-w-0 flex-1 gap-0.5">
                      <span className="line-clamp-2 font-semibold leading-tight">{hit.title}</span>
                      {hit.authors.length > 0 ? (
                        <span className="truncate text-caption text-foreground-muted">{hit.authors.join(", ")}</span>
                      ) : null}
                      <Availability totalItems={hit.totalItems} availableItems={hit.availableItems} messages={messages} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {found.total > found.hits.length ? (
            <Link
              href={`/catalogue?${new URLSearchParams({ q: found.query })}`}
              className="flex min-h-11 items-center justify-center rounded-control border border-border-strong text-body-sm font-semibold outline-offset-2 active:bg-surface-muted focus-visible:outline-2 focus-visible:outline-ring"
            >
              {fill(c.seeAllResults, { count: String(found.total) })}
            </Link>
          ) : null}
        </section>
      )}
    </>
  );
}
