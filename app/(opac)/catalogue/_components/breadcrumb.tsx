"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, House } from "lucide-react";

/** The Navigation API, where the browser has it (Chromium, Safari). */
type NavigationLike = {
  currentEntry?: { index: number } | null;
  entries?: () => { url: string | null }[];
};

export type Crumb = {
  label: string;
  href: string;
  /**
   * "Catalogue" seen from a book or an author: go back to the list the
   * reader left — restored by the router from its cache, at the same scroll
   * position, with its filters — rather than load a fresh one.
   */
  back?: boolean;
};

/**
 * Where the reader is, and the way back up (CDI request): Accueil ›
 * Catalogue › the book. Each step is a link but the last, which names the
 * current page.
 *
 * A `back` step returns through history when the previous entry is a list
 * of the catalogue (read through the Navigation API). Otherwise — a book
 * opened from the home, a shared link, a new tab — the step's own address
 * is followed, the whole catalogue, which is also where it goes without
 * JavaScript.
 */
export function Breadcrumb({ label, crumbs, current }: { label: string; crumbs: Crumb[]; current: string }) {
  const router = useRouter();

  const goBack = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    const navigation = (window as Window & { navigation?: NavigationLike }).navigation;
    const index = navigation?.currentEntry?.index ?? -1;
    const previous = index > 0 ? navigation?.entries?.()[index - 1]?.url : null;
    // Only back to a list of the catalogue itself: a book opened from the
    // home (the carousel, the phone's search sheet) must not send
    // "Catalogue" back to the home.
    const from = previous ? new URL(previous) : null;
    if (from && from.origin === window.location.origin && from.pathname === "/catalogue") {
      event.preventDefault();
      router.back();
    }
  };

  return (
    <nav aria-label={label}>
      <ol className="flex flex-wrap items-center gap-x-1 text-body-sm">
        {crumbs.map((crumb, index) => (
          <li key={crumb.label} className="flex items-center gap-1">
            <Link
              href={crumb.href}
              onClick={crumb.back ? goBack : undefined}
              className="flex min-h-11 items-center gap-1.5 rounded-control px-1 font-semibold text-accent underline-offset-2 outline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
            >
              {index === 0 ? <House aria-hidden="true" className="size-4" strokeWidth={2.25} /> : null}
              {crumb.label}
            </Link>
            <ChevronRight aria-hidden="true" className="size-4 text-foreground-muted" />
          </li>
        ))}
        <li aria-current="page" className="min-w-0 max-w-full truncate px-1 text-foreground-muted">
          {current}
        </li>
      </ol>
    </nav>
  );
}
