import type { CirculationMessageKey } from "@/app/gestion/circulation/_lib/messages";

/**
 * Separate from `_actions.ts` because every export of a `"use server"` module
 * must be an async function.
 */
export type AccountState =
  | { kind: "idle" }
  | { kind: "ok"; key: CirculationMessageKey; values: Record<string, string> }
  | { kind: "error"; key: CirculationMessageKey; values: Record<string, string> };

export const IDLE: AccountState = { kind: "idle" };
