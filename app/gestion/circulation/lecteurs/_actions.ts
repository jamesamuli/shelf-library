"use server";

import { revalidatePath } from "next/cache";
import { createPatron, type PatronInput } from "@/lib/patrons";
import { importPatrons, previewImport } from "@/lib/patron-import";
import type { ImportState, ReaderFormState } from "./_lib/state";
import { requireSession } from "../../../(auth)/_lib/session";

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "");

function readPatron(formData: FormData): PatronInput {
  return {
    email: text(formData, "email"),
    lastName: text(formData, "lastName"),
    firstName: text(formData, "firstName"),
    barcode: text(formData, "barcode"),
    login: text(formData, "login"),
    gender: text(formData, "gender"),
    schoolClassId: text(formData, "schoolClassId"),
    categoryId: text(formData, "categoryId"),
    statusId: text(formData, "statusId"),
    enrolledOn: text(formData, "enrolledOn"),
    expiresOn: text(formData, "expiresOn"),
    notes: text(formData, "notes"),
  };
}

export async function createPatronAction(
  previous: ReaderFormState,
  formData: FormData,
): Promise<ReaderFormState> {
  await requireSession("gestion");

  const input = readPatron(formData);
  const result = await createPatron(input);

  if (!result.ok) {
    return {
      kind: "invalid",
      errors: result.errors,
      values: input,
      attempt: (previous.kind === "invalid" ? previous.attempt : 0) + 1,
    };
  }

  revalidatePath("/gestion/circulation");
  revalidatePath("/gestion");
  return {
    kind: "created",
    name: `${input.firstName.trim()} ${input.lastName.trim()}`.trim(),
    barcode: result.barcode,
  };
}

/** Reads the uploaded file and judges it. Writes nothing. */
export async function previewImportAction(
  _previous: ImportState,
  formData: FormData,
): Promise<ImportState> {
  await requireSession("gestion");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { kind: "error", key: "errFileEmpty" };
  }

  const content = await file.text();
  const preview = await previewImport(content);
  if (preview.fileError) {
    return {
      kind: "error",
      key: preview.fileError === "EMPTY" ? "errFileEmpty" : "errNoEmailColumn",
    };
  }

  return { kind: "preview", preview, text: content };
}

export async function confirmImportAction(
  _previous: ImportState,
  formData: FormData,
): Promise<ImportState> {
  await requireSession("gestion");

  const content = text(formData, "text");
  if (!content.trim()) return { kind: "error", key: "errFileEmpty" };

  const result = await importPatrons(content);
  if (result.fileError) {
    return {
      kind: "error",
      key: result.fileError === "EMPTY" ? "errFileEmpty" : "errNoEmailColumn",
    };
  }
  if (result.created === 0 && result.rejected.length > 0) {
    return { kind: "error", key: "errNoValidRows" };
  }

  revalidatePath("/gestion/circulation");
  revalidatePath("/gestion");
  return { kind: "imported", created: result.created, rejected: result.rejected };
}

