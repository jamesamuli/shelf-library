/**
 * Form state for the cataloguing screens. Separate from `_actions.ts`
 * because every export of a `"use server"` module must be an async function.
 *
 * Message keys are a union rather than `string`, so adding a refusal without
 * adding its wording is a type error.
 */
export type CataloguingMessageKey =
  | "errTitleRequired"
  | "errYearInvalid"
  | "errHasCopies"
  | "errNotFound"
  | "errBarcodeRequired"
  | "errBarcodeTaken"
  | "errOnLoan";

import type { ItemInput, RecordInput } from "@/lib/cataloguing";

export type RecordFormState =
  | { kind: "idle" }
  | { kind: "saved" }
  | {
      kind: "invalid";
      fields: Partial<Record<"title" | "publicationYear", CataloguingMessageKey>>;
      /**
       * What was typed. React clears an uncontrolled form once a function
       * action returns, so without echoing this back a validation failure
       * wipes everything the librarian entered — and the empty `required`
       * title then blocks the next submit without explaining why.
       */
      values: RecordInput;
      /** Changes per attempt, so the form remounts and re-applies values. */
      attempt: number;
    }
  | { kind: "error"; key: CataloguingMessageKey; detail?: string };

export type ItemFormState =
  | { kind: "idle" }
  | { kind: "saved" }
  | { kind: "deleted" }
  | {
      kind: "error";
      key: CataloguingMessageKey;
      detail?: string;
      /** Echoed back for the same reason as above. */
      values?: ItemInput;
      attempt?: number;
    };

export const RECORD_IDLE: RecordFormState = { kind: "idle" };
export const ITEM_IDLE: ItemFormState = { kind: "idle" };

import type { AuthorCheck, BiographyDraft } from "@/lib/cataloguing-assistant";

/** Paid AI requests today against the cap, for the assistant to show. */
export type AssistantUsage = { used: number; limit: number; enabled: boolean };

export type AuthorCheckState = {
  checks: AuthorCheck[];
  /** Authors of the ISBN, offered when the field was empty. */
  suggestions: string[];
  usage: AssistantUsage;
};

type AiRefusal = "NOT_CONFIGURED" | "DAILY_LIMIT" | "FAILED";

export type BiographyDraftState =
  | { kind: "draft"; draft: BiographyDraft; cached: boolean; usage: AssistantUsage }
  | { kind: "error"; reason: AiRefusal; usage: AssistantUsage };

export type AbstractDraftState =
  | { kind: "draft"; abstract: string; cached: boolean; usage: AssistantUsage }
  | { kind: "unknown"; usage: AssistantUsage }
  | { kind: "error"; reason: AiRefusal; usage: AssistantUsage };
