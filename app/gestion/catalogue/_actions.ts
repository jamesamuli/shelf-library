"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { aiConfigured, dailyLimit, usageToday } from "@/lib/ai";
import {
  deleteItem,
  deleteRecord,
  saveItem,
  saveRecord,
  type AuthorChoice,
  type RecordInput,
} from "@/lib/cataloguing";
import { checkAuthors, draftAbstract, draftBiography, translateAbstract } from "@/lib/cataloguing-assistant";
import type {
  AssistantUsage,
  AuthorCheckState,
  BiographyDraftState,
  AbstractDraftState,
  CataloguingMessageKey,
  ItemFormState,
  RecordFormState,
} from "./_lib/state";
import { requirePermission } from "../../(auth)/_lib/session";

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "");

function readRecord(formData: FormData): RecordInput {
  return {
    title: text(formData, "title"),
    subtitle: text(formData, "subtitle"),
    standardNumber: text(formData, "standardNumber"),
    publicationYear: text(formData, "publicationYear"),
    abstract: text(formData, "abstract"),
    abstractEn: text(formData, "abstractEn"),
    documentTypeId: text(formData, "documentTypeId"),
    statusId: text(formData, "statusId"),
    authors: text(formData, "authors"),
    publishers: text(formData, "publishers"),
    subjects: text(formData, "subjects"),
    genreIds: formData.getAll("genreIds").map(String),
    authorChoices: readChoices(text(formData, "authorChoices")),
  };
}

const optionalText = (value: unknown, max: number) =>
  typeof value === "string" && value.trim() ? value.trim().slice(0, max) : undefined;

/**
 * The assistant's decisions arrive as JSON in a hidden field: browser data,
 * so each one is rebuilt field by field, and anything else is dropped.
 */
function readChoices(raw: string): Record<string, AuthorChoice> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw || "{}");
  } catch {
    return {};
  }
  if (!parsed || typeof parsed !== "object") return {};
  const choices: Record<string, AuthorChoice> = {};
  for (const [line, value] of Object.entries(parsed as Record<string, unknown>).slice(0, 20)) {
    if (!value || typeof value !== "object") continue;
    const v = value as Record<string, unknown>;
    choices[line] = {
      id: Number.isInteger(v.id) ? (v.id as number) : undefined,
      isNew: v.isNew === true,
      biography: optionalText(v.biography, 1200),
      dates: optionalText(v.dates, 20),
      openLibraryKey: optionalText(v.openLibraryKey, 30),
      wikidataId: optionalText(v.wikidataId, 30),
      isni: optionalText(v.isni, 30),
    };
  }
  return choices;
}

async function usage(): Promise<AssistantUsage> {
  return { used: await usageToday(), limit: dailyLimit(), enabled: aiConfigured() };
}

/** Steps 1 and 2 of the assistant: free, no AI. */
export async function checkAuthorsAction(authors: string, isbn: string): Promise<AuthorCheckState> {
  await requirePermission("catalog.edit");
  const lines = authors.split("\n").map((line) => line.trim()).filter(Boolean).slice(0, 10);
  const { checks, suggestions } = await checkAuthors(lines, isbn.slice(0, 20));
  return { checks, suggestions, usage: await usage() };
}

/** Step 3: one paid request, unless the same question was asked before. */
export async function draftBiographyAction(input: {
  author: string;
  title: string;
  year: string;
  publisher: string;
  otherTitles: string[];
}): Promise<BiographyDraftState> {
  const session = await requirePermission("catalog.edit");
  const { answer, draft } = await draftBiography(
    {
      author: input.author.slice(0, 200),
      book: { title: input.title.slice(0, 300), year: input.year.slice(0, 4), publisher: input.publisher.slice(0, 200) },
      otherTitles: input.otherTitles.slice(0, 5).map((title) => title.slice(0, 200)),
    },
    Number(session.sub),
  );
  const used = { used: answer.used, limit: answer.limit, enabled: aiConfigured() };
  if (!answer.ok) return { kind: "error", reason: answer.reason, usage: used };
  if (!draft) return { kind: "error", reason: "FAILED", usage: used };
  return { kind: "draft", draft, cached: answer.cached, usage: used };
}

/** The "Proposer un résumé" helper: one paid request, unless cached. */
export async function draftAbstractAction(input: {
  title: string;
  authors: string;
  isbn: string;
  year: string;
}): Promise<AbstractDraftState> {
  const session = await requirePermission("catalog.edit");
  const { answer, abstract } = await draftAbstract(
    {
      title: input.title.slice(0, 300),
      authors: input.authors.split("\n").map((line) => line.trim()).filter(Boolean).slice(0, 5),
      isbn: input.isbn.slice(0, 20),
      year: input.year.slice(0, 4),
    },
    Number(session.sub),
  );
  const used = { used: answer.used, limit: answer.limit, enabled: aiConfigured() };
  if (!answer.ok) return { kind: "error", reason: answer.reason, usage: used };
  if (!abstract) return { kind: "unknown", usage: used };
  return { kind: "draft", abstract, cached: answer.cached, usage: used };
}

/** "Traduire en anglais (IA)": one cheap paid request, unless cached. */
export async function translateAbstractAction(french: string): Promise<AbstractDraftState> {
  const session = await requirePermission("catalog.edit");
  const { answer, english } = await translateAbstract(french.slice(0, 4000), Number(session.sub));
  const used = { used: answer.used, limit: answer.limit, enabled: aiConfigured() };
  if (!answer.ok) return { kind: "error", reason: answer.reason, usage: used };
  if (!english) return { kind: "error", reason: "FAILED", usage: used };
  return { kind: "draft", abstract: english, cached: answer.cached, usage: used };
}

const FIELD_ERRORS: Record<string, CataloguingMessageKey> = {
  TITLE_REQUIRED: "errTitleRequired",
  YEAR_INVALID: "errYearInvalid",
};

/**
 * Creating redirects to the new record's page; updating stays put so the
 * librarian can keep working on the copies below the form.
 */
export async function saveRecordAction(
  _previous: RecordFormState,
  formData: FormData,
): Promise<RecordFormState> {
  await requirePermission("catalog.edit");

  const rawId = text(formData, "id");
  const id = rawId ? Number(rawId) : null;
  const input = readRecord(formData);
  const result = await saveRecord(id, input);

  if (!result.ok) {
    return {
      kind: "invalid",
      fields: {
        ...(result.errors.title
          ? { title: FIELD_ERRORS[result.errors.title] }
          : {}),
        ...(result.errors.publicationYear
          ? { publicationYear: FIELD_ERRORS[result.errors.publicationYear] }
          : {}),
      },
      values: input,
      attempt: (_previous.kind === "invalid" ? _previous.attempt : 0) + 1,
    };
  }

  revalidatePath("/gestion/catalogue");
  revalidatePath("/");
  revalidatePath(`/catalogue/${result.id}`);
  if (id === null) redirect(`/gestion/catalogue/${result.id}`);

  return { kind: "saved" };
}

export async function deleteRecordAction(
  _previous: RecordFormState,
  formData: FormData,
): Promise<RecordFormState> {
  await requirePermission("catalog.delete");

  const id = Number(text(formData, "id"));
  if (!Number.isInteger(id)) return { kind: "error", key: "errNotFound" };

  const result = await deleteRecord(id);
  if (!result.ok) {
    return {
      kind: "error",
      key: result.reason === "HAS_COPIES" ? "errHasCopies" : "errNotFound",
      detail: result.detail,
    };
  }

  revalidatePath("/gestion/catalogue");
  redirect("/gestion/catalogue");
}

export async function saveItemAction(
  _previous: ItemFormState,
  formData: FormData,
): Promise<ItemFormState> {
  await requirePermission("catalog.edit");

  const recordId = Number(text(formData, "recordId"));
  const rawItemId = text(formData, "itemId");
  const itemId = rawItemId ? Number(rawItemId) : null;

  const input = {
    barcode: text(formData, "barcode"),
    callNumber: text(formData, "callNumber"),
    locationId: text(formData, "locationId"),
    sectionId: text(formData, "sectionId"),
    statusId: text(formData, "statusId"),
  };
  const result = await saveItem(recordId, itemId, input);

  if (!result.ok) {
    const key: CataloguingMessageKey =
      result.reason === "BARCODE_TAKEN"
        ? "errBarcodeTaken"
        : result.reason === "BARCODE_REQUIRED"
          ? "errBarcodeRequired"
          : "errNotFound";
    return {
      kind: "error",
      key,
      values: input,
      attempt: (_previous.kind === "error" ? (_previous.attempt ?? 0) : 0) + 1,
    };
  }

  revalidatePath(`/gestion/catalogue/${recordId}`);
  revalidatePath(`/catalogue/${recordId}`);
  return { kind: "saved" };
}

export async function deleteItemAction(
  _previous: ItemFormState,
  formData: FormData,
): Promise<ItemFormState> {
  await requirePermission("catalog.delete");

  const itemId = Number(text(formData, "itemId"));
  const recordId = Number(text(formData, "recordId"));
  if (!Number.isInteger(itemId)) return { kind: "error", key: "errNotFound" };

  const result = await deleteItem(itemId);
  if (!result.ok) {
    return {
      kind: "error",
      key: result.reason === "ON_LOAN" ? "errOnLoan" : "errNotFound",
      detail: result.detail,
    };
  }

  revalidatePath(`/gestion/catalogue/${recordId}`);
  revalidatePath(`/catalogue/${recordId}`);
  return { kind: "deleted" };
}
