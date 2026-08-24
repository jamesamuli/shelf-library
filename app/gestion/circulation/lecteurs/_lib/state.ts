import type { PatronErrors, PatronInput } from "@/lib/patrons";
import type { Preview, PreviewRow } from "@/lib/patron-import";

/**
 * Form state for the reader screens. Separate from `_actions.ts` because every
 * export of a `"use server"` module must be an async function.
 */
export type ReaderFormState =
  | { kind: "idle" }
  | { kind: "created"; name: string; barcode: string }
  | {
      kind: "invalid";
      errors: PatronErrors;
      /** Echoed back: React clears an uncontrolled form after an action. */
      values: PatronInput;
      attempt: number;
    };

export type ImportState =
  | { kind: "idle" }
  | {
      kind: "preview";
      preview: Preview;
      /** The file, carried through so confirming re-judges the same text. */
      text: string;
    }
  | { kind: "imported"; created: number; rejected: PreviewRow[] }
  | { kind: "error"; key: "errFileEmpty" | "errNoEmailColumn" | "errNoValidRows" };

export const READER_IDLE: ReaderFormState = { kind: "idle" };
export const IMPORT_IDLE: ImportState = { kind: "idle" };
