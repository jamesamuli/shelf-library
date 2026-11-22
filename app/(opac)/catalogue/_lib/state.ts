import type { ReserveRefusal } from "@/lib/holds";

/**
 * What the author and publisher dialogs show: who they are, and their first
 * few books in the CDI.
 */
export type EntityCard = {
  name: string;
  /** An author's dates; a publisher's town. */
  detail: string | null;
  /** An author's biography; a publisher's description. */
  text: string | null;
  website: string | null;
  /** The full list: the author's page, or the catalogue filtered by publisher. */
  allHref: string;
  /** All their visible books, of which `books` is the first few. */
  total: number;
  books: {
    id: number;
    title: string;
    year: number | null;
    coverUrl: string | null;
    totalItems: number;
    availableItems: number;
  }[];
};

/**
 * Separate from `_actions.ts` because every export of a `"use server"` module
 * must be an async function.
 */
export type ReserveState =
  | { kind: "idle" }
  | { kind: "ok"; title: string }
  | { kind: "error"; reason: ReserveRefusal };

export const RESERVE_IDLE: ReserveState = { kind: "idle" };

/** A result in the phone's search sheet: just enough to pick the book. */
export type SheetHit = {
  id: number;
  title: string;
  authors: string[];
  coverUrl: string | null;
  totalItems: number;
  availableItems: number;
};
