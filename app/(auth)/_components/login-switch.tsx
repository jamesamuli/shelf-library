"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { GraduationCap, House, UserCog, type LucideIcon } from "lucide-react";
import type { PortalSlug } from "../_lib/portals";

/**
 * Each audience keeps its own colour — Shelf teal for readers, navy for staff,
 * matching its card — and the switch takes the colour of whichever is chosen.
 * Spelled out in full because Tailwind only generates classes it can find.
 */
const TABS: Record<PortalSlug, { Icon: LucideIcon; fill: string; edge: string; text: string }> = {
  opac: { Icon: GraduationCap, fill: "bg-accent", edge: "sm:border-accent", text: "text-accent" },
  gestion: { Icon: UserCog, fill: "bg-primary", edge: "sm:border-primary", text: "text-primary" },
};

/**
 * One sign-in card at a time, switched by a two-tab control (CDI request).
 *
 * Each tab is a real link to its portal's URL, so without JavaScript a click
 * simply loads that page. With it, the switch happens in place — the cards
 * cross-fade and slide, the frame eases to the new card's height — and the
 * address bar follows (`replaceState`, which Next's router tracks), so a
 * refresh or a bookmark still lands on the card that was showing.
 *
 * Both cards stay mounted: the hidden one is `inert`, out of the tab order and
 * the accessibility tree, but a half-typed username survives a look at the
 * other card.
 *
 * On phones (CDI request) the same tab list drops to a bar at the foot of the
 * screen — icon over label, like the catalogue's "Découvrir" / "Rechercher" —
 * with "Accueil" beside it, so the card has the screen to itself. It is one
 * tab list either way, only placed differently, so keyboard and screen-reader
 * behaviour does not change. `data-dock` lets the header drop its own
 * "Accueil" on phones while this bar carries it.
 */
export function LoginSwitch({
  initial,
  order,
  labels,
  label,
  home,
  panels,
}: {
  initial: PortalSlug;
  order: PortalSlug[];
  labels: Record<PortalSlug, string>;
  /** Names the tab list for screen readers. */
  label: string;
  /** The phone bar's last item, as on the catalogue's bar. */
  home: { href: string; label: string };
  panels: Record<PortalSlug, React.ReactNode>;
}) {
  const [active, setActive] = useState(initial);
  const [height, setHeight] = useState<number>();
  const panelRefs = useRef<Partial<Record<PortalSlug, HTMLDivElement | null>>>({});
  const tabRefs = useRef<Partial<Record<PortalSlug, HTMLAnchorElement | null>>>({});

  // The frame takes the active card's height, and re-measures if that card
  // grows (an error message appearing, a font loading late).
  useEffect(() => {
    const panel = panelRefs.current[active];
    if (!panel) return;
    const observer = new ResizeObserver(() => setHeight(panel.offsetHeight));
    observer.observe(panel);
    return () => observer.disconnect();
  }, [active]);

  // The query the page arrived with (`?next=`, `?google=`) belongs to the
  // card it arrived on, so it only rides along in the URL on that card.
  const arrivalQuery = useRef<string | null>(null);
  const select = (slug: PortalSlug) => {
    if (slug === active) return;
    arrivalQuery.current ??= window.location.search;
    setActive(slug);
    window.history.replaceState(
      null,
      "",
      `/login/${slug}${slug === initial ? arrivalQuery.current : ""}`,
    );
  };

  // Arrow keys move along the tabs and select, as in WAI-ARIA's tabs pattern.
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const step = event.key === "ArrowRight" ? 1 : -1;
    const next = order[(order.indexOf(active) + step + order.length) % order.length];
    select(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <div className="stack gap-content">
      {/* Above the card from `sm` up (the wrapper dissolves); on phones, the
          bottom bar. */}
      <div
        data-dock
        className="sm:contents max-sm:fixed max-sm:inset-x-0 max-sm:bottom-0 max-sm:z-40 max-sm:grid max-sm:grid-cols-3 max-sm:border-t max-sm:border-border max-sm:bg-surface/95 max-sm:pb-[env(safe-area-inset-bottom)] max-sm:shadow-modal max-sm:backdrop-blur"
      >
        <div
          role="tablist"
          aria-label={label}
          onKeyDown={onKeyDown}
          className={`relative grid grid-cols-2 transition-colors duration-500 motion-reduce:transition-none max-sm:col-span-2 sm:rounded-card sm:border-2 sm:bg-surface sm:p-1 ${TABS[active].edge}`}
        >
          {/* The highlight slides under the selected tab, changing to its
              colour on the way; on phones it fills the tab edge to edge. */}
          <span
            aria-hidden="true"
            className={`absolute w-1/2 transition-[translate,background-color] duration-500 ease-out motion-reduce:transition-none max-sm:inset-y-0 max-sm:left-0 sm:inset-y-1 sm:left-1 sm:w-[calc(50%-0.25rem)] sm:rounded-control ${
              TABS[active].fill
            } ${active === order[1] ? "translate-x-full" : ""}`}
          />
          {order.map((slug) => {
            const { Icon, text } = TABS[slug];
            const selected = slug === active;
            return (
              <a
                key={slug}
                ref={(element) => {
                  tabRefs.current[slug] = element;
                }}
                href={`/login/${slug}`}
                role="tab"
                id={`tab-${slug}`}
                aria-selected={selected}
                aria-controls={`tabpanel-${slug}`}
                onClick={(event) => {
                  event.preventDefault();
                  select(slug);
                }}
                className={`relative z-10 flex min-h-16 flex-col items-center justify-center gap-1 px-2 py-2 text-center font-heading text-caption leading-tight font-semibold outline-offset-[-4px] transition-colors duration-500 focus-visible:outline-2 focus-visible:outline-ring sm:min-h-12 sm:flex-row sm:gap-2 sm:rounded-control sm:px-3 sm:text-body sm:outline-offset-2 ${
                  // Unchosen, a tab still shows its own colour, so each reads as
                  // its audience before it is picked.
                  selected ? "text-primary-foreground" : `${text} hover:bg-surface-muted`
                }`}
              >
                <Icon aria-hidden="true" className="size-6 shrink-0 sm:size-5" strokeWidth={2} />
                {labels[slug]}
              </a>
            );
          })}
        </div>
        {/* A light rule keeps it apart from the staff tab when that one is
            chosen, both being navy. */}
        <Link
          href={home.href}
          className="stack min-h-16 items-center justify-center gap-1 border-l-2 border-surface bg-primary font-heading text-caption font-semibold text-primary-foreground outline-offset-[-4px] transition-colors active:bg-primary-hover focus-visible:outline-2 focus-visible:outline-ring sm:hidden"
        >
          <House aria-hidden="true" className="size-6" strokeWidth={2} />
          {home.label}
        </Link>
      </div>

      <div
        // The negative margin and the panels' padding give the cards' shadows
        // room inside the clipping frame.
        className="relative -m-2 overflow-hidden transition-[height] duration-500 ease-out motion-reduce:transition-none"
        style={height === undefined ? undefined : { height }}
      >
        {order.map((slug, index) => {
          const selected = slug === active;
          // The card that is not showing waits off to its own side: the first
          // to the left, the second to the right, so a switch reads as a slide.
          const away = index === 0 ? "-translate-x-12" : "translate-x-12";
          return (
            <div
              key={slug}
              ref={(element) => {
                panelRefs.current[slug] = element;
              }}
              role="tabpanel"
              id={`tabpanel-${slug}`}
              aria-labelledby={`tab-${slug}`}
              inert={!selected}
              className={`inset-x-0 top-0 p-2 transition-[opacity,translate] duration-500 ease-out motion-reduce:transition-none ${
                selected ? "relative opacity-100" : `pointer-events-none absolute opacity-0 ${away}`
              }`}
            >
              {panels[slug]}
            </div>
          );
        })}
      </div>
    </div>
  );
}
