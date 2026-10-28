import type { Messages } from "@/lib/i18n";

/**
 * Separate from `_actions.ts` because every export of a `"use server"` module
 * must be an async function — a constant exported from one reaches the client
 * as a server reference and the first render reads undefined.
 */
export type StaffMessageKey = Extract<
  keyof Messages["staff"],
  "saved" | "errNotFound" | "errLastAdmin"
>;

export type StaffState =
  | { kind: "idle" }
  | { kind: "ok"; key: StaffMessageKey; values: Record<string, string> }
  | { kind: "error"; key: StaffMessageKey; values: Record<string, string> };

export const STAFF_IDLE: StaffState = { kind: "idle" };
