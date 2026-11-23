"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LayoutList, List } from "lucide-react";
import { VIEW_COOKIE, isView, type View } from "../_lib/view";

/** The cookie as the browser holds it now. */
function savedView(): View | null {
  const value = document.cookie
    .split("; ")
    .find((pair) => pair.startsWith(`${VIEW_COOKIE}=`))
    ?.slice(VIEW_COOKIE.length + 1);
  return isView(value) ? value : null;
}

function saveView(view: View) {
  document.cookie = `${VIEW_COOKIE}=${view}; path=/; max-age=31536000; samesite=lax`;
}

/**
 * The detailed and list views of the same page of results, both rendered by
 * the server, and the switch between them. Switching only shows the other
 * one (CDI request): the records are already here, so there is nothing to
 * load. The choice is remembered in a cookie for the next pages.
 *
 * Phones always show the detailed cards and no switch (CDI request): the
 * dense list is a desktop tool.
 *
 * The toolbar — switch, where one is in the results, sort — stays at the
 * top of the screen while the list scrolls under it (CDI request).
 *
 * Without JavaScript the switch is two links carrying `vue`.
 */
export function ResultViews({
  initial,
  summary,
  labels,
  hrefs,
  sort,
  detailed,
  list,
}: {
  initial: View;
  /** Where these results sit in the set: "1–12 sur 106". */
  summary: string;
  labels: { group: string; etendu: string; liste: string };
  /** The no-JavaScript fallback for each button. */
  hrefs: Record<View, string>;
  sort: React.ReactNode;
  detailed: React.ReactNode;
  list: React.ReactNode;
}) {
  const params = useSearchParams();
  // Read on the client too: back from a book, the router may replay this
  // page as first rendered, before the reader switched.
  const [view, setView] = useState<View>(() => {
    const asked = params.get("vue");
    if (isView(asked)) return asked;
    return (typeof document === "undefined" ? null : savedView()) ?? initial;
  });

  const choose = (event: React.MouseEvent, next: View) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey) return;
    event.preventDefault();
    setView(next);
    saveView(next);
    // A `vue` in the address (an old link) would now contradict the cookie.
    if (params.has("vue")) {
      const target = new URLSearchParams(params);
      target.delete("vue");
      window.history.replaceState(null, "", `?${target}`);
    }
  };

  return (
    <>
      {/* Stuck to the top while the list scrolls under it; edge to edge
          of the panel (its padding undone), on the panel's own colour. */}
      <div className="sticky top-0 z-20 -mx-3 -mt-3 flex items-center gap-3 rounded-t-panel bg-surface-muted/95 px-3 py-2 backdrop-blur-sm sm:-mx-5 sm:-mt-5 sm:px-5 sm:py-3">
        <div
          role="group"
          aria-label={labels.group}
          className="inline-flex rounded-control border border-border-strong bg-surface p-0.5 max-sm:hidden"
        >
          {(
            [
              ["etendu", LayoutList],
              ["liste", List],
            ] as const
          ).map(([value, Icon]) => (
            <Link
              key={value}
              href={hrefs[value]}
              scroll={false}
              onClick={(event) => choose(event, value)}
              aria-current={view === value ? "true" : undefined}
              className={`flex min-h-10 items-center gap-2 rounded-control px-3 text-body-sm font-medium outline-offset-2 transition-colors focus-visible:outline-2 focus-visible:outline-ring ${
                view === value ? "bg-accent text-primary-foreground" : "text-foreground hover:bg-surface-muted"
              }`}
            >
              <Icon aria-hidden="true" className="size-4" />
              {labels[value]}
            </Link>
          ))}
        </div>
        {/* The count above says it for screen readers. */}
        <p aria-hidden="true" className="text-body-sm tabular-nums text-foreground-muted">
          {summary}
        </p>
        {/* At the right, and narrower on phones (CDI request). */}
        <div className="ml-auto min-w-0">{sort}</div>
      </div>
      <div className={view === "etendu" ? undefined : "sm:hidden"}>{detailed}</div>
      <div className={view === "liste" ? "max-sm:hidden" : "hidden"}>{list}</div>
    </>
  );
}
