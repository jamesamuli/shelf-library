import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { fill, type Messages } from "@/lib/i18n";
import { LinkLoader } from "../../_components/route-loader";

/** First, last, and the current page with its neighbours; gaps as null. */
function pageList(page: number, pageCount: number): (number | null)[] {
  const wanted = new Set([1, pageCount, page - 1, page, page + 1]);
  const pages = [...wanted].filter((n) => n >= 1 && n <= pageCount).sort((a, b) => a - b);
  return pages.flatMap((n, i) => (i > 0 && n - pages[i - 1] > 1 ? [null, n] : [n]));
}

const STEP =
  "flex min-h-11 items-center gap-1 rounded-control px-3 text-body-sm font-medium text-accent outline-offset-2 hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-ring";

/**
 * Numbered pages, as in the reference design, from `sm` up; a phone gets
 * previous / "page x of y" / next, which fits one thumb-sized row.
 */
export function Pagination({
  page,
  pageCount,
  href,
  label,
  messages,
}: {
  page: number;
  pageCount: number;
  href: (page: number) => string;
  /** Top and bottom copies need different names to be told apart. */
  label: string;
  messages: Messages;
}) {
  if (pageCount <= 1) return null;
  const c = messages.catalogue;
  return (
    <nav aria-label={label} className="flex items-center justify-center gap-1">
      {page > 1 ? (
        <Link href={href(page - 1)} className={STEP}>
          <ChevronLeft aria-hidden="true" className="size-4" />
          {c.previous}
          <LinkLoader />
        </Link>
      ) : null}

      <ol className="flex items-center gap-1 max-sm:hidden">
        {pageList(page, pageCount).map((n, i) =>
          n === null ? (
            <li key={`gap-${i}`} aria-hidden="true" className="px-1 text-foreground-subtle">
              …
            </li>
          ) : (
            <li key={n}>
              <Link
                href={href(n)}
                aria-label={fill(c.pageLink, { page: String(n) })}
                aria-current={n === page ? "page" : undefined}
                className={`grid min-h-11 min-w-11 place-items-center rounded-control px-2 text-body-sm font-medium tabular-nums outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring ${
                  n === page ? "bg-accent text-primary-foreground" : "text-accent hover:bg-surface-muted"
                }`}
              >
                {n}
                <LinkLoader />
              </Link>
            </li>
          ),
        )}
      </ol>
      <span className="px-2 text-body-sm text-foreground-muted sm:hidden">
        {fill(c.pageOf, { page: String(page), pageCount: String(pageCount) })}
      </span>

      {page < pageCount ? (
        <Link href={href(page + 1)} className={STEP}>
          {c.next}
          <ChevronRight aria-hidden="true" className="size-4" />
          <LinkLoader />
        </Link>
      ) : null}
    </nav>
  );
}
