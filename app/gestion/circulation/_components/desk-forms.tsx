"use client";

import { useActionState } from "react";
import type { Messages } from "@/lib/i18n";
import type { Locale } from "@/lib/preferences";
import { checkInAction, checkOutAction, renewAction } from "../_actions";
import { IDLE, renderMessage, type DeskState } from "../_lib/messages";

const FIELD =
  "min-h-11 w-full rounded-control border border-border bg-background px-3 text-body-sm font-mono outline-offset-2 placeholder:font-sans placeholder:text-foreground-subtle focus-visible:outline-2 focus-visible:outline-ring";

const PRIMARY =
  "min-h-11 cluster items-center justify-center rounded-control bg-primary px-4 text-body-sm font-medium text-primary-foreground outline-offset-2 hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60";

const SECONDARY =
  "min-h-11 cluster items-center justify-center rounded-control border border-border px-3 text-caption outline-offset-2 hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60";

/**
 * Result of the last desk action. `aria-live` matters more here than
 * anywhere else in the app: a librarian scanning barcodes is looking at the
 * shelf, not the screen.
 */
function Feedback({
  state,
  messages,
  locale,
}: {
  state: DeskState;
  messages: Messages;
  locale: Locale;
}) {
  return (
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
      {state.kind === "idle"
        ? ""
        : renderMessage(messages, locale, state.key, state.values)}
    </p>
  );
}

/**
 * Shared barcode field. The input is uncontrolled: React clears a form after
 * a function action runs, which is exactly the desk behaviour — scan, scan,
 * scan — without a state-clearing effect. Because that clearing also happens
 * on refusal, the override is a sibling form replaying the echoed barcode
 * rather than a second button inside this one.
 */
function BarcodeForm({
  action,
  state,
  pending,
  messages,
  locale,
  label,
  placeholder,
  submitLabel,
  forceLabel,
  takeFocus = false,
  children,
}: {
  action: (formData: FormData) => void;
  state: DeskState;
  pending: boolean;
  messages: Messages;
  locale: Locale;
  label: string;
  placeholder: string;
  submitLabel: string;
  forceLabel?: string;
  takeFocus?: boolean;
  children?: React.ReactNode;
}) {
  const canForce =
    state.kind === "error" && state.overridable && forceLabel !== undefined;

  return (
    <div className="stack gap-inline">
      <form action={action} className="stack gap-inline">
        {children}
        <label className="stack gap-1.5">
          <span className="text-caption font-medium text-foreground-muted">
            {label}
          </span>
          <input
            name="barcode"
            placeholder={placeholder}
            autoComplete="off"
            spellCheck={false}
            required
            autoFocus={takeFocus}
            className={FIELD}
          />
        </label>
        <button type="submit" className={PRIMARY} disabled={pending}>
          {submitLabel}
        </button>
      </form>

      <Feedback state={state} messages={messages} locale={locale} />

      {canForce ? (
        <form action={action}>
          {children}
          <input
            type="hidden"
            name="barcode"
            value={state.kind === "error" ? (state.values.barcode ?? "") : ""}
          />
          <input type="hidden" name="force" value="1" />
          <button type="submit" className={SECONDARY} disabled={pending}>
            {forceLabel}
          </button>
        </form>
      ) : null}
    </div>
  );
}

export function CheckOutForm({
  patronId,
  messages,
  locale,
}: {
  patronId: number;
  messages: Messages;
  locale: Locale;
}) {
  const [state, formAction, pending] = useActionState(checkOutAction, IDLE);
  const c = messages.circulation;

  return (
    <BarcodeForm
      action={formAction}
      state={state}
      pending={pending}
      messages={messages}
      locale={locale}
      label={c.itemLabel}
      placeholder={c.itemPlaceholder}
      submitLabel={c.checkOutAction}
      forceLabel={c.checkOutAnyway}
      /* Once a patron is open, lending is what you came to do. Check-in must
         not autofocus as well — the last one to mount would win, and the
         cursor would sit in the wrong box. */
      takeFocus
    >
      <input type="hidden" name="patronId" value={patronId} />
    </BarcodeForm>
  );
}

export function CheckInForm({
  messages,
  locale,
}: {
  messages: Messages;
  locale: Locale;
}) {
  const [state, formAction, pending] = useActionState(checkInAction, IDLE);
  const c = messages.circulation;

  return (
    <BarcodeForm
      action={formAction}
      state={state}
      pending={pending}
      messages={messages}
      locale={locale}
      label={c.itemLabel}
      placeholder={c.itemPlaceholder}
      submitLabel={c.checkInAction}
    />
  );
}

/**
 * Per-loan renew. Return reuses the check-in action with the item's own
 * barcode, so a loan is closed by exactly one code path however it is closed.
 */
export function LoanActions({
  loanId,
  itemBarcode,
  messages,
  locale,
}: {
  loanId: number;
  itemBarcode: string;
  messages: Messages;
  locale: Locale;
}) {
  const [renewState, renew, renewPending] = useActionState(renewAction, IDLE);
  const [returnState, returnItem, returnPending] = useActionState(
    checkInAction,
    IDLE,
  );
  const c = messages.circulation;
  const state = renewState.kind !== "idle" ? renewState : returnState;

  return (
    <div className="stack gap-1.5">
      <div className="cluster gap-2">
        <form action={renew}>
          <input type="hidden" name="loanId" value={loanId} />
          <button type="submit" className={SECONDARY} disabled={renewPending}>
            {c.renewAction}
          </button>
        </form>

        {renewState.kind === "error" && renewState.overridable ? (
          <form action={renew}>
            <input type="hidden" name="loanId" value={loanId} />
            <input type="hidden" name="force" value="1" />
            <button type="submit" className={SECONDARY} disabled={renewPending}>
              {c.renewAnyway}
            </button>
          </form>
        ) : null}

        <form action={returnItem}>
          <input type="hidden" name="barcode" value={itemBarcode} />
          <button type="submit" className={SECONDARY} disabled={returnPending}>
            {c.returnAction}
          </button>
        </form>
      </div>

      <Feedback state={state} messages={messages} locale={locale} />
    </div>
  );
}
