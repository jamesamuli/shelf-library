"use client";

import { useActionState } from "react";
import Link from "next/link";
import { fill, type Messages } from "@/lib/i18n";
import type { Locale } from "@/lib/preferences";
import { formatDate } from "@/lib/dates";
import type { HoldView } from "@/lib/holds";
import { holdAction } from "../_actions";
import { HOLD_IDLE } from "../_lib/state";

const BUTTON =
  "min-h-11 cluster items-center justify-center rounded-control border border-border px-3 text-caption outline-offset-2 hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60";

const FIELD =
  "min-h-11 w-full rounded-control border border-border bg-background px-3 text-body-sm font-mono outline-offset-2 placeholder:font-sans placeholder:text-foreground-subtle focus-visible:outline-2 focus-visible:outline-ring";

/**
 * The whole list shares one action state, and the feedback sits above the
 * table rather than inside the row.
 *
 * Row-scoped feedback looks tidier but cannot work here: lending or deleting a
 * reservation takes it out of this list, so the row — and the message it just
 * produced — unmounts before anyone can read it. The confirmation has to
 * outlive the thing it is about.
 */
export function HoldsTable({
  holds,
  late,
  locale,
  messages,
  emptyLabel,
}: {
  holds: HoldView[];
  late: boolean;
  locale: Locale;
  messages: Messages;
  emptyLabel: string;
}) {
  const [state, dispatch, pending] = useActionState(holdAction, HOLD_IDLE);
  const h = messages.holds;
  const now = new Date();
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());

  return (
    <div className="stack gap-inline">
      <p
        aria-live="polite"
        className={`text-body-sm ${
          state.kind === "ok"
            ? "text-success"
            : state.kind === "error"
              ? "text-danger"
              : "sr-only"
        }`}
      >
        {state.kind === "idle" ? "" : fill(h[state.key], state.values)}
      </p>

      {/* The empty state lives here, not in the page. Lending or deleting the
          last reservation empties the list, and if the page swapped this
          component out for a paragraph the message above would go with it. */}
      {holds.length === 0 ? (
        <p className="rounded-card border border-border bg-surface p-6 text-center text-body-sm text-foreground-muted">
          {emptyLabel}
        </p>
      ) : (
      <div className="overflow-x-auto rounded-card border border-border">
        <table className="w-full min-w-[64rem] text-body-sm">
          <thead className="bg-surface-muted text-caption text-foreground-muted">
            <tr>
              <th scope="col" className="p-3 text-left">{h.colReader}</th>
              <th scope="col" className="p-3 text-left">{h.colDocument}</th>
              <th scope="col" className="p-3 text-left">{h.colPlacedAt}</th>
              <th scope="col" className="p-3 text-left">{h.colUntil}</th>
              <th scope="col" className="p-3 text-left">{h.colCopy}</th>
              <th scope="col" className="p-3 text-left">{h.colLocation}</th>
              <th scope="col" className="p-3 text-left">{h.colActions}</th>
            </tr>
          </thead>
          <tbody>
            {holds.map((hold) => {
              const daysLate =
                hold.expiresOn === null
                  ? 0
                  : Math.max(
                      0,
                      Math.round(
                        (todayUtc - new Date(hold.expiresOn).getTime()) / 86_400_000,
                      ),
                    );

              return (
                <tr key={hold.id} className="border-t border-border align-top">
                  <td className="p-3">
                    <Link
                      href={`/gestion/circulation?patron=${encodeURIComponent(hold.patronBarcode)}`}
                      className="text-accent underline-offset-2 hover:underline"
                    >
                      {hold.patronName}
                    </Link>
                    <div className="text-caption font-mono text-foreground-muted">
                      {hold.patronBarcode}
                    </div>
                  </td>
                  <td className="p-3">
                    {hold.recordId ? (
                      <Link
                        href={`/catalogue/${hold.recordId}`}
                        className="text-accent underline-offset-2 hover:underline"
                      >
                        {hold.title}
                      </Link>
                    ) : (
                      hold.title
                    )}
                  </td>
                  <td className="p-3 text-foreground-muted">
                    {formatDate(hold.placedAt, locale)}
                  </td>
                  <td className="p-3">
                    {hold.expiresOn === null ? (
                      <span className="text-foreground-muted">{h.waitingForCopy}</span>
                    ) : late ? (
                      <span className="text-warning">
                        {fill(h.lateBy, { count: String(daysLate) })}
                      </span>
                    ) : (
                      <span className="text-success">
                        {fill(h.keptUntil, {
                          date: formatDate(hold.expiresOn, locale),
                        })}
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    {hold.itemBarcode ? (
                      <>
                        <span className="font-mono text-caption">
                          {hold.itemBarcode}
                        </span>
                        {hold.itemCallNumber ? (
                          <div className="text-caption text-foreground-muted">
                            {hold.itemCallNumber}
                          </div>
                        ) : null}
                        {hold.itemIsOnLoan ? (
                          <div className="text-caption text-warning">
                            {h.onLoanFlag}
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <span className="text-foreground-subtle">—</span>
                    )}
                  </td>
                  {/* Never blank: a missing reference row degrades to a dash
                      rather than dropping the line, which is what legacy's
                      inner-joined get_expl_info() did. */}
                  <td className="p-3 text-caption text-foreground-muted">
                    {hold.itemLocation} · {hold.itemSection}
                  </td>
                  <td className="p-3">
                    <div className="cluster gap-2">
                      {hold.itemBarcode ? (
                        <form action={dispatch}>
                          <input type="hidden" name="intent" value="lend" />
                          <input type="hidden" name="holdId" value={hold.id} />
                          <button type="submit" className={BUTTON} disabled={pending}>
                            {h.lend}
                          </button>
                        </form>
                      ) : null}

                      <form action={dispatch} className="cluster gap-1">
                        <input type="hidden" name="intent" value="assign" />
                        <input type="hidden" name="holdId" value={hold.id} />
                        <input
                          name="itemBarcode"
                          required
                          placeholder={h.assignTitle}
                          aria-label={h.assignTitle}
                          autoComplete="off"
                          className={`${FIELD} w-40`}
                        />
                        <button type="submit" className={BUTTON} disabled={pending}>
                          {h.assign}
                        </button>
                      </form>

                      <form action={dispatch}>
                        <input type="hidden" name="intent" value="cancel" />
                        <input type="hidden" name="holdId" value={hold.id} />
                        <button
                          type="submit"
                          className={`${BUTTON} text-danger`}
                          disabled={pending}
                        >
                          {h.cancel}
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}
