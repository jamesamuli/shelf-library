"use client";

import { useActionState, useEffect, useRef } from "react";
import { BookmarkCheck, BookmarkPlus } from "lucide-react";
import { fill, type Messages } from "@/lib/i18n";
import { reserveAction } from "../_actions";
import { RESERVE_IDLE } from "../_lib/state";
import { Modal } from "./modal";
import { SignInPrompt, withParam } from "./sign-in-prompt";

/**
 * "Réserver le livre".
 *
 * Signed out, it explains why an account is needed and offers the sign-in
 * there (`SignInPrompt`), without leaving the list (CDI request). The
 * sign-in comes back with `?reserver=<id>`, and the confirmation then opens
 * by itself, one tap from done. Signed in, the confirmation opens straight
 * away. Placing a reservation is never a side effect of a URL: it takes the
 * confirm button.
 *
 * `icon` is the phone card's, in the row of round icons under the cover.
 */
export function ReserveButton({
  recordId,
  title,
  intro,
  signedIn,
  googleReady,
  returnTo,
  autoOpen = false,
  icon = false,
  messages,
}: {
  recordId: number;
  title: string;
  /** The explanation, with the pickup window already filled in. */
  intro: string;
  signedIn: boolean;
  googleReady: boolean;
  returnTo: string;
  autoOpen?: boolean;
  icon?: boolean;
  messages: Messages;
}) {
  const c = messages.catalogue;
  const dialog = useRef<HTMLDialogElement>(null);
  const prompt = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [state, formAction, pending] = useActionState(reserveAction, RESERVE_IDLE);
  const suffix = icon ? "-phone" : "";

  useEffect(() => {
    // Each card renders a desktop and a phone layout; only the one on screen
    // may open, or the dialog would sit inside a hidden card.
    if (!autoOpen || !signedIn || !trigger.current?.checkVisibility()) return;
    dialog.current?.showModal();
    // Spent: a reload or a shared link must not ask again.
    const url = new URL(window.location.href);
    url.searchParams.delete("reserver");
    window.history.replaceState(window.history.state, "", url);
  }, [autoOpen, signedIn]);

  const Icon = state.kind === "ok" ? BookmarkCheck : BookmarkPlus;

  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-haspopup="dialog"
        title={icon ? c.reserveBook : undefined}
        onClick={() => (signedIn ? dialog : prompt).current?.showModal()}
        className={
          icon
            ? "grid size-11 place-items-center rounded-full text-foreground outline-offset-2 hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-ring"
            : "flex min-h-11 items-center gap-2 rounded-control border-2 border-accent bg-surface px-4 text-body-sm font-semibold text-accent outline-offset-2 hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-ring"
        }
      >
        <Icon aria-hidden="true" className={icon ? "size-7" : "size-4"} strokeWidth={icon ? 1.75 : 2.25} />
        {icon ? <span className="sr-only">{c.reserveBook}</span> : c.reserveBook}
      </button>

      {signedIn ? (
        <Modal ref={dialog} id={`reserve-${recordId}${suffix}`} title={fill(c.reserveTitle, { title })} closeLabel={c.closePanel}>
          {state.kind === "ok" ? (
            <p role="status" className="text-body font-medium text-success">
              {fill(c.reserveOk, { title: state.title })}
            </p>
          ) : (
            <form action={formAction} className="stack gap-4">
              <input type="hidden" name="recordId" value={recordId} />
              <p className="text-body">{intro}</p>
              {state.kind === "error" ? (
                <p role="alert" className="text-body-sm font-medium text-danger">
                  {c.reserveErrors[state.reason]}
                </p>
              ) : null}
              <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={() => dialog.current?.close()}
                  className="min-h-11 rounded-control border border-border-strong px-4 text-body-sm font-medium outline-offset-2 hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-ring"
                >
                  {c.cancel}
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="min-h-11 rounded-control bg-accent px-4 text-body-sm font-semibold text-primary-foreground outline-offset-2 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60"
                >
                  {c.reserveConfirm}
                </button>
              </div>
            </form>
          )}
        </Modal>
      ) : (
        <SignInPrompt
          ref={prompt}
          id={`reserve-prompt-${recordId}${suffix}`}
          reason="reserve"
          next={withParam(returnTo, "reserver", recordId)}
          googleReady={googleReady}
          messages={messages}
        />
      )}
    </>
  );
}
