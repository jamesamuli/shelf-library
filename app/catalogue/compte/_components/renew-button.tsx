"use client";

import { useActionState } from "react";
import type { Messages } from "@/lib/i18n";
import type { Locale } from "@/lib/preferences";
import { renderMessage } from "@/app/gestion/circulation/_lib/messages";
import { renewOwnLoanAction } from "../_actions";
import { IDLE } from "../_lib/state";

export function RenewButton({
  loanId,
  messages,
  locale,
}: {
  loanId: number;
  messages: Messages;
  locale: Locale;
}) {
  const [state, formAction, pending] = useActionState(renewOwnLoanAction, IDLE);

  return (
    <form action={formAction} className="stack gap-1.5">
      <input type="hidden" name="loanId" value={loanId} />
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 cluster items-center justify-center rounded-control border border-border px-3 text-caption outline-offset-2 hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60"
      >
        {messages.circulation.renewAction}
      </button>
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
          : renderMessage(messages, locale, state.key, state.values)}
      </p>
    </form>
  );
}
