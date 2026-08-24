import type { Messages } from "@/lib/i18n";

/**
 * Result of a reservation action. Separate from `_actions.ts` because every
 * export of a `"use server"` module must be an async function.
 */
export type HoldMessageKey = Extract<
  keyof Messages["holds"],
  | "placed"
  | "assigned"
  | "cancelled"
  | "lent"
  | "cleared"
  | "errHoldNotFound"
  | "errPatronNotFound"
  | "errItemNotFound"
  | "errRecordNotFound"
  | "errPatronNotAllowed"
  | "errAlreadyHeld"
  | "errItemOnLoan"
  | "errItemWrongTitle"
  | "errItemAlreadySetAside"
  | "errNoCopyAssigned"
>;

export type HoldActionState =
  | { kind: "idle" }
  | { kind: "ok"; key: HoldMessageKey; values: Record<string, string> }
  | { kind: "error"; key: HoldMessageKey; values: Record<string, string> };

export const HOLD_IDLE: HoldActionState = { kind: "idle" };
