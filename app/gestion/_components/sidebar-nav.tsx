"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useState } from "react";
import { fill, type Messages } from "@/lib/i18n";

function DashboardIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className="size-5 shrink-0"
      aria-hidden="true"
    >
      <path
        d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CirculationIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className="size-5 shrink-0"
      aria-hidden="true"
    >
      <path
        d="M4 8h13l-3-3M20 16H7l3 3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CatalogueIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className="size-5 shrink-0"
      aria-hidden="true"
    >
      <path
        d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5Zm16 0A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5Z"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HoldsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className="size-5 shrink-0"
      aria-hidden="true"
    >
      <path d="M7 4h10a1 1 0 0 1 1 1v15l-6-3.5L6 20V5a1 1 0 0 1 1-1Z" strokeLinejoin="round" />
    </svg>
  );
}

function ReadersIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className="size-5 shrink-0"
      aria-hidden="true"
    >
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20a5.5 5.5 0 0 1 11 0M16 11.2a3 3 0 0 0 0-5.9M17.5 20a5.6 5.6 0 0 0-2.2-4.4" strokeLinecap="round" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="size-4 shrink-0"
      aria-hidden="true"
    >
      <path d="m8 10 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** The public catalogue: same content, seen as a reader sees it. */
function PublicViewIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className="size-5 shrink-0"
      aria-hidden="true"
    >
      <path
        d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.75" />
    </svg>
  );
}

type Item = {
  href: string;
  label: string;
  icon: React.ReactNode;
  children?: Item[];
};

const LINK =
  "cluster min-h-11 items-center gap-3 rounded-control px-3 outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring";

/** One selection at a time, and it always looks the same wherever it lands. */
const SELECTED = "bg-accent text-white";

function tone(selected: boolean, withinSection: boolean) {
  if (selected) return SELECTED;
  return withinSection
    ? "text-white hover:bg-white/10"
    : "text-white/70 hover:bg-white/10 hover:text-white";
}

function NavLink({
  item,
  selected,
  /** A parent whose child is selected: signals the open section, not a second selection. */
  withinSection = false,
  small = false,
}: {
  item: Item;
  selected: boolean;
  withinSection?: boolean;
  small?: boolean;
}) {
  return (
    <Link
      href={item.href}
      aria-current={selected ? "page" : undefined}
      className={`${LINK} ${small ? "text-caption" : "text-body-sm"} ${tone(selected, withinSection)}`}
    >
      <span className={small ? "[&_svg]:size-4" : undefined}>{item.icon}</span>
      <span>{item.label}</span>
    </Link>
  );
}

/**
 * A nav section that folds.
 *
 * The parent keeps its own link — Circulation is the loan desk, the most-used
 * screen in the back office, and burying it one click deeper to make room for
 * a disclosure would be a poor trade. So the row carries both: the label
 * navigates, the chevron folds.
 *
 * The fold animates `grid-template-rows` between `0fr` and `1fr`, which
 * transitions to the content's real height without measuring it in JS. While
 * closed the panel is `inert`, or the hidden links stay in the tab order and
 * keyboard focus disappears into a collapsed section.
 */
function NavSection({
  item,
  selected,
  childSelected,
  isSelected,
  messages,
}: {
  item: Item;
  selected: boolean;
  childSelected: boolean;
  isSelected: (href: string) => boolean;
  messages: Messages;
}) {
  const pathname = usePathname();
  const panelId = useId();

  const [open, setOpen] = useState(selected || childSelected);

  // Navigating into the section re-opens it, so you can always see where you
  // are — adjusted during render rather than in an effect, which would paint
  // the closed state first and then animate it open for no reason.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    if ((selected || childSelected) && !open) setOpen(true);
  }

  const label = fill(
    open ? messages.collapseSection : messages.expandSection,
    { section: item.label },
  );

  return (
    <li>
      {/* The row owns the state background so the label and the chevron read
          as one control, not a pill with a chip stuck to it. */}
      <div className={`flex items-center rounded-control ${tone(selected, childSelected)}`}>
        <Link
          href={item.href}
          aria-current={selected ? "page" : undefined}
          className={`${LINK} flex-1 text-body-sm`}
        >
          {item.icon}
          <span>{item.label}</span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={label}
          title={label}
          className="grid size-11 shrink-0 place-items-center rounded-control outline-offset-2 hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-ring"
        >
          <span
            className={`transition-transform duration-300 ease-out motion-reduce:transition-none ${
              open ? "" : "-rotate-90"
            }`}
          >
            <ChevronIcon />
          </span>
        </button>
      </div>

      <div
        id={panelId}
        inert={!open}
        className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          {/* 1.4rem puts the rail through the centre of the parent's icon
              (px-3 + half of size-5), so the children read as hanging off it
              rather than merely being indented. */}
          <ul className="mt-1 stack gap-1 border-l border-white/25 pl-3 ml-[1.4rem]">
            {item.children?.map((child) => (
              <li key={child.href}>
                <NavLink item={child} selected={isSelected(child.href)} small />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </li>
  );
}

/**
 * Only routes that exist are listed. The mockup shows nine sections; eight of
 * them have nothing behind them yet, and a nav item that leads nowhere is
 * worse than an absent one.
 *
 * Réservations and Lecteurs are screens *within* circulation, so they are
 * nested rather than listed as peers. Selection is exact, never
 * `startsWith`: a parent lit up alongside its own selected child reads as two
 * selections, and the reader cannot tell which page they are on.
 */
export function SidebarNav({ messages }: { messages: Messages }) {
  const pathname = usePathname();
  const c = messages.circulation;

  const items: Item[] = [
    { href: "/gestion", label: c.navDashboard, icon: <DashboardIcon /> },
    {
      href: "/gestion/circulation",
      label: c.navCirculation,
      icon: <CirculationIcon />,
      children: [
        {
          href: "/gestion/circulation/reservations",
          label: messages.holds.navHolds,
          icon: <HoldsIcon />,
        },
        {
          href: "/gestion/circulation/lecteurs",
          label: messages.readers.navReaders,
          icon: <ReadersIcon />,
        },
      ],
    },
    {
      href: "/gestion/catalogue",
      label: messages.cataloguing.navCataloguing,
      icon: <CatalogueIcon />,
    },
    { href: "/catalogue", label: c.navCatalogue, icon: <PublicViewIcon /> },
  ];

  // Cataloguing has sub-pages of its own (nouveau, edit) with no nav entry of
  // their own, so it stays selected while you are inside one.
  const isSelected = (href: string) =>
    href === "/gestion/catalogue"
      ? pathname === href || pathname.startsWith(`${href}/`)
      : pathname === href;

  return (
    <nav aria-label={c.navDashboard}>
      <ul className="stack gap-1">
        {items.map((item) =>
          item.children ? (
            <NavSection
              key={item.href}
              item={item}
              selected={isSelected(item.href)}
              childSelected={item.children.some((child) => isSelected(child.href))}
              isSelected={isSelected}
              messages={messages}
            />
          ) : (
            <li key={item.href}>
              <NavLink item={item} selected={isSelected(item.href)} />
            </li>
          ),
        )}
      </ul>
    </nav>
  );
}
