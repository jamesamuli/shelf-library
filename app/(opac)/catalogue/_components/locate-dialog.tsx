"use client";

import { useRef } from "react";
import { CircleCheck, Clock, MapPin } from "lucide-react";
import type { Holding } from "@/lib/catalogue";
import { formatDate } from "@/lib/dates";
import { fill, type Messages } from "@/lib/i18n";
import type { Locale } from "@/lib/preferences";
import { Modal } from "./modal";

/** One copy's state, as a badge: the shape carries it as well as the colour. */
function CopyState({ copy, messages, locale }: { copy: Holding; messages: Messages; locale: Locale }) {
  const c = messages.catalogue;
  if (copy.isOnLoan) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-control bg-genre-ochre px-3 py-1.5 text-caption font-semibold text-white">
        <Clock aria-hidden="true" className="size-4" />
        {copy.dueOn ? fill(c.onLoanUntil, { date: formatDate(copy.dueOn, locale) }) : c.allOnLoan}
      </span>
    );
  }
  if (!copy.isLoanable) {
    return (
      <span className="inline-flex rounded-control border border-border-strong px-3 py-1.5 text-caption font-semibold">
        {copy.status ?? c.onShelf}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-control bg-accent px-3 py-1.5 text-caption font-semibold text-primary-foreground">
      <CircleCheck aria-hidden="true" className="size-4" />
      {c.copyAvailable}
    </span>
  );
}

/**
 * "Localiser le livre": the copies in a dialog, after the CDI's reference
 * design — how many, a reminder of what the call number is for, and one row
 * per copy. The copies come with the results, so it opens at once.
 */
export function LocateButton({
  recordId,
  title,
  holdings,
  messages,
  locale,
}: {
  recordId: number;
  title: string;
  holdings: Holding[];
  messages: Messages;
  locale: Locale;
}) {
  const c = messages.catalogue;
  const dialog = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => dialog.current?.showModal()}
        className="flex min-h-11 items-center gap-2 rounded-control bg-accent px-4 text-body-sm font-semibold text-primary-foreground outline-offset-2 transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-ring"
      >
        <MapPin aria-hidden="true" className="size-4" strokeWidth={2.25} />
        {c.locateBook}
      </button>
      <Modal ref={dialog} id={`locate-${recordId}`} title={fill(c.copiesTitle, { title })} closeLabel={c.closePanel}>
        <p className="font-semibold">{fill(c.copiesFound, { count: String(holdings.length) })}</p>
        <p className="text-body-sm text-foreground-muted">{c.copiesHint}</p>
        <CopiesTable holdings={holdings} messages={messages} locale={locale} />
      </Modal>
    </>
  );
}

/**
 * One row per copy: copy number, call number, location · section,
 * availability and acquisition date. In the "Localiser" dialog, and in full
 * on the record page.
 */
export function CopiesTable({ holdings, messages, locale }: { holdings: Holding[]; messages: Messages; locale: Locale }) {
  const c = messages.catalogue;
  const cell = "px-4 py-3 text-center";
  return (
    // Scrolls sideways on a phone: focusable and named, so it can be scrolled
    // from the keyboard.
    <div
      tabIndex={0}
      role="region"
      aria-label={c.holdings}
      className="overflow-x-auto rounded-card border-2 border-accent outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring"
    >
      <table className="w-full min-w-[40rem] text-body-sm">
        <thead className="bg-accent text-left text-primary-foreground">
          <tr>
            {[c.colCopy, c.callNumber, c.colPlace, c.colAvailability, c.colAcquired].map((heading) => (
              <th key={heading} scope="col" className={`${cell} font-semibold`}>
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {holdings.map((copy) => (
            <tr key={copy.id} className="border-t border-border">
              <td className={`${cell} font-mono`}>{copy.barcode}</td>
              <td className={`${cell} font-mono font-semibold`}>{copy.callNumber ?? "—"}</td>
              <td className={cell}>{[copy.location, copy.section].filter(Boolean).join(" · ") || "—"}</td>
              <td className={cell}>
                <CopyState copy={copy} messages={messages} locale={locale} />
              </td>
              <td className={`${cell} tabular-nums`}>
                {copy.acquiredOn ? formatDate(copy.acquiredOn, locale) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
