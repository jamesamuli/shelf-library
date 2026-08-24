"use client";

import { useActionState } from "react";
import { fill, type Messages } from "@/lib/i18n";
import { holdAction } from "../_actions";
import { HOLD_IDLE, type HoldActionState } from "../_lib/state";

const PRIMARY =
  "min-h-11 cluster items-center justify-center rounded-control bg-primary px-4 text-body-sm font-medium text-primary-foreground outline-offset-2 hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60";

const FIELD =
  "min-h-11 w-full rounded-control border border-border bg-background px-3 text-body-sm font-mono outline-offset-2 placeholder:font-sans placeholder:text-foreground-subtle focus-visible:outline-2 focus-visible:outline-ring";

function Feedback({
  state,
  messages,
}: {
  state: HoldActionState;
  messages: Messages;
}) {
  return (
    <p
      aria-live="polite"
      className={`text-caption ${
        state.kind === "ok"
          ? "text-success"
          : state.kind === "error"
            ? "text-danger"
            : "sr-only"
      }`}
    >
      {state.kind === "idle"
        ? ""
        : fill(messages.holds[state.key], state.values)}
    </p>
  );
}

/** Place a reservation from the desk. Legacy's circ/resa/ form. */
export function PlaceHoldForm({ messages }: { messages: Messages }) {
  const [state, dispatch, pending] = useActionState(holdAction, HOLD_IDLE);
  const h = messages.holds;

  return (
    <form action={dispatch} className="stack gap-inline">
      <input type="hidden" name="intent" value="place" />
      <div className="grid gap-inline sm:grid-cols-2">
        <label className="stack gap-1.5">
          <span className="text-caption font-medium text-foreground-muted">
            {h.fieldReaderCard}
          </span>
          <input name="patronBarcode" required autoComplete="off" className={FIELD} />
        </label>
        <label className="stack gap-1.5">
          <span className="text-caption font-medium text-foreground-muted">
            {h.fieldDocumentBarcode}
          </span>
          <input name="itemBarcode" required autoComplete="off" className={FIELD} />
        </label>
      </div>
      <button type="submit" className={`${PRIMARY} w-fit`} disabled={pending}>
        {h.place}
      </button>
      <Feedback state={state} messages={messages} />
    </form>
  );
}

/** Clear a copy from the reshelving worklist by scanning it. */
export function ReshelveForm({ messages }: { messages: Messages }) {
  const [state, dispatch, pending] = useActionState(holdAction, HOLD_IDLE);
  const h = messages.holds;

  return (
    <form action={dispatch} className="stack gap-inline">
      <input type="hidden" name="intent" value="clear" />
      <label className="stack gap-1.5">
        <span className="text-caption font-medium text-foreground-muted">
          {h.fieldDocumentBarcode}
        </span>
        <input
          name="itemBarcode"
          required
          autoFocus
          autoComplete="off"
          className={`${FIELD} max-w-xs`}
        />
      </label>
      <button type="submit" className={`${PRIMARY} w-fit`} disabled={pending}>
        {h.clear}
      </button>
      <Feedback state={state} messages={messages} />
    </form>
  );
}
