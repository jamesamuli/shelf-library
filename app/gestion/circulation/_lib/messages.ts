import type { Messages } from "@/lib/i18n";
import type { Locale } from "@/lib/preferences";
import { fill } from "@/lib/i18n";
import { formatDate } from "@/lib/dates";

/**
 * The subset of circulation copy the desk actions may return. Keeping it a
 * union rather than `string` means adding a refusal without adding its
 * wording is a type error.
 */
export type CirculationMessageKey =
  | "checkOutOk"
  | "checkInOk"
  | "checkInLate"
  | "renewOk"
  | "errPatronNotFound"
  | "errItemNotFound"
  | "errPatronExpired"
  | "errPatronBlocked"
  | "errPatronNotAllowed"
  | "errItemNotLoanable"
  | "errAlreadyOnLoanHere"
  | "errAlreadyOnLoanElsewhere"
  | "errQuotaReached"
  | "errNotOnLoan"
  | "errLoanNotFound"
  | "errRenewNotAllowed"
  | "errRenewLimit"
  | "errRenewNoLaterDate";

/**
 * Result of a desk action.
 *
 * Lives here, not beside the actions: every export of a `"use server"` module
 * must be an async function, so a plain constant declared there is handed to
 * the client as a server reference instead of the object it looks like.
 */
export type DeskState =
  | { kind: "idle" }
  | { kind: "ok"; key: CirculationMessageKey; values: Record<string, string> }
  | {
      kind: "error";
      key: CirculationMessageKey;
      values: Record<string, string>;
      /** Present when the librarian may repeat the action with force. */
      overridable?: boolean;
    };

export const IDLE: DeskState = { kind: "idle" };

/** Fills a result message, formatting any `date` value in the reader's locale. */
export function renderMessage(
  messages: Messages,
  locale: Locale,
  key: CirculationMessageKey,
  values: Record<string, string>,
): string {
  const resolved = values.date
    ? { ...values, date: formatDate(values.date, locale) }
    : values;
  return fill(messages.circulation[key], resolved);
}
