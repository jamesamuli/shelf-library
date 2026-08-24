"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  deleteItem,
  deleteRecord,
  saveItem,
  saveRecord,
  type RecordInput,
} from "@/lib/cataloguing";
import type {
  CataloguingMessageKey,
  ItemFormState,
  RecordFormState,
} from "./_lib/state";
import { requireSession } from "../../(auth)/_lib/session";

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "");

function readRecord(formData: FormData): RecordInput {
  return {
    title: text(formData, "title"),
    subtitle: text(formData, "subtitle"),
    standardNumber: text(formData, "standardNumber"),
    publicationYear: text(formData, "publicationYear"),
    abstract: text(formData, "abstract"),
    documentTypeId: text(formData, "documentTypeId"),
    statusId: text(formData, "statusId"),
    authors: text(formData, "authors"),
    publishers: text(formData, "publishers"),
    subjects: text(formData, "subjects"),
  };
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
  await requireSession("gestion");

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
  revalidatePath(`/catalogue/${result.id}`);
  if (id === null) redirect(`/gestion/catalogue/${result.id}`);

  return { kind: "saved" };
}

export async function deleteRecordAction(
  _previous: RecordFormState,
  formData: FormData,
): Promise<RecordFormState> {
  await requireSession("gestion");

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
  await requireSession("gestion");

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
  await requireSession("gestion");

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
