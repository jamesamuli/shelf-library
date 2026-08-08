import Link from "next/link";
import type { Messages } from "@/lib/i18n";
import { PORTAL_SLUGS, type PortalSlug } from "../_lib/portals";

/**
 * Segmented control for choosing a portal. Rendered as links rather than a
 * client-side toggle so each portal keeps its own URL, stays bookmarkable, and
 * works without JavaScript. `aria-current` marks the active segment.
 *
 * Icons match the login mockup: a trend line for Gestion (administration),
 * an open book for OPAC (the catalogue).
 */

function ChartIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      className="size-5 shrink-0"
      aria-hidden="true"
    >
      <path d="M3 3v16a2 2 0 0 0 2 2h16" strokeLinecap="round" />
      <path
        d="m7 14 3.5-3.5 3 3L18 8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M18 8h-3.2M18 8v3.2" strokeLinecap="round" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      className="size-5 shrink-0"
      aria-hidden="true"
    >
      <path
        d="M12 7.5v12M12 7.5C10.6 6.2 8.7 5.5 6.5 5.5H3v12h3.5c2.2 0 4.1.7 5.5 2M12 7.5c1.4-1.3 3.3-2 5.5-2H21v12h-3.5c-2.2 0-4.1.7-5.5 2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const ICONS: Record<PortalSlug, () => React.ReactElement> = {
  gestion: ChartIcon,
  opac: BookIcon,
};

export function PortalSwitch({
  active,
  messages,
}: {
  active: PortalSlug;
  messages: Messages;
}) {
  return (
    <nav aria-label={messages.portalNavLabel}>
      <ul className="grid grid-cols-2 gap-1 rounded-card border border-border bg-surface-muted p-1">
        {PORTAL_SLUGS.map((slug) => {
          const copy = messages.portals[slug];
          const isActive = slug === active;
          const Icon = ICONS[slug];
          return (
            <li key={slug}>
              <Link
                href={`/login/${slug}`}
                aria-current={isActive ? "page" : undefined}
                className={`cluster justify-center gap-2 rounded-control px-3 py-2.5 outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground-muted hover:bg-surface"
                }`}
              >
                <Icon />
                <span className="stack text-left">
                  <span className="text-body-sm font-medium">{copy.name}</span>
                  <span className="text-caption font-normal opacity-80">
                    {copy.subtitle}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
