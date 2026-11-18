"use client";

import Link from "next/link";
import { useRef } from "react";
import { CircleUserRound, Compass, LogIn, Search, X, type LucideIcon } from "lucide-react";

/** `button` is the bar's short label; `title` heads the sheet. */
type Panel = { title: string; button: string; content: React.ReactNode };

/**
 * Phones only, on every catalogue page: a bar at the bottom of the screen
 * holding "Découvrir" and the search, each opening a sheet that slides up,
 * and the sign-in (or account) link, moved down from the header (CDI
 * requests). It is in the layout, not the home, because the header no
 * longer carries sign-in on phones and every page still needs a way in.
 *
 * The sheets are native modal dialogs, which bring the focus trap, Escape to
 * close, an inert page behind and focus returned to the button for free.
 * Tapping the dimmed backdrop closes them too.
 */
export function MobileDock({
  label,
  closeLabel,
  discover,
  search,
  account,
}: {
  label: string;
  closeLabel: string;
  discover: Panel;
  search: Panel;
  account: { href: string; label: string; signedIn: boolean };
}) {
  const AccountIcon = account.signedIn ? CircleUserRound : LogIn;
  const discoverSheet = useRef<HTMLDialogElement>(null);
  const searchSheet = useRef<HTMLDialogElement>(null);

  const open = (sheet: HTMLDialogElement | null, focusInput = false) => {
    if (!sheet) return;
    sheet.showModal();
    // The search sheet exists to type into: go straight to the field, which
    // also brings up the keyboard.
    if (focusInput) sheet.querySelector<HTMLInputElement>("input[type=search]")?.focus();
  };

  return (
    <>
      <nav
        aria-label={label}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] shadow-modal backdrop-blur sm:hidden"
      >
        {/* The rule between the first two keeps them apart; the sign-in item
            needs none, standing on the navy it had in the header. */}
        <div className="grid grid-cols-3">
          <DockButton
            Icon={Compass}
            label={discover.button}
            onClick={() => open(discoverSheet.current)}
            className="border-r border-border"
          />
          <DockButton
            Icon={Search}
            label={search.button}
            onClick={() => open(searchSheet.current, true)}
          />
          <Link
            href={account.href}
            className="stack min-h-16 items-center justify-center gap-1 bg-primary px-1 text-center font-heading text-body-sm font-semibold leading-tight text-primary-foreground outline-offset-[-4px] transition-colors active:bg-primary-hover focus-visible:outline-2 focus-visible:outline-ring"
          >
            <AccountIcon aria-hidden="true" className="size-6" strokeWidth={2} />
            {account.label}
          </Link>
        </div>
      </nav>
      <Sheet ref={discoverSheet} id="sheet-discover" panel={discover} closeLabel={closeLabel} />
      <Sheet ref={searchSheet} id="sheet-search" panel={search} closeLabel={closeLabel} />
    </>
  );
}

function DockButton({
  Icon,
  label,
  onClick,
  className = "",
}: {
  Icon: LucideIcon;
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      onClick={onClick}
      className={`stack min-h-16 items-center justify-center gap-1 font-heading text-body-sm font-semibold text-foreground outline-offset-[-4px] transition-colors active:bg-surface-muted focus-visible:outline-2 focus-visible:outline-ring ${className}`}
    >
      <Icon aria-hidden="true" className="size-6 text-accent" strokeWidth={2} />
      {label}
    </button>
  );
}

function Sheet({
  ref,
  id,
  panel,
  closeLabel,
}: {
  ref: React.Ref<HTMLDialogElement>;
  id: string;
  panel: Panel;
  closeLabel: string;
}) {
  return (
    <dialog
      ref={ref}
      aria-labelledby={`${id}-title`}
      // The dialog itself is only hit on its backdrop: the content fills it.
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close();
      }}
      // Pinned to the bottom edge, full width; it rises from below on open
      // and sinks on close (allow-discrete lets display/overlay animate).
      className="mx-0 mb-0 mt-auto max-h-[85dvh] w-full max-w-none translate-y-full overflow-hidden rounded-t-panel bg-surface p-0 text-foreground shadow-modal transition-[translate,display,overlay] transition-discrete duration-300 ease-out backdrop:bg-black/40 open:translate-y-0 motion-reduce:transition-none starting:open:translate-y-full"
    >
      <div className="stack max-h-[85dvh] gap-content overflow-y-auto overscroll-contain px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3">
        <span
          aria-hidden="true"
          className="mx-auto h-1.5 w-10 shrink-0 rounded-full bg-border-strong"
        />
        <div className="flex items-center justify-between gap-3">
          <h2 id={`${id}-title`} className="font-heading text-heading-2">
            {panel.title}
          </h2>
          <form method="dialog">
            <button
              type="submit"
              aria-label={closeLabel}
              className="grid size-11 place-items-center rounded-full border border-border text-foreground-muted outline-offset-2 hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-ring"
            >
              <X aria-hidden="true" className="size-5" />
            </button>
          </form>
        </div>
        {panel.content}
      </div>
    </dialog>
  );
}
