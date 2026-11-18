"use server";

import { redirect } from "next/navigation";
import { fill, messagesFor } from "@/lib/i18n";
import { getLocale } from "@/lib/preferences";
import { verifyStaffCredentials } from "../_lib/credentials";
import { createSession } from "../_lib/session";
import { PORTALS, safeRedirect } from "../_lib/portals";

export type LoginState = {
  /** Shown in the form-level alert. */
  message?: string;
  fieldErrors?: {
    identifier?: string;
    password?: string;
  };
};

/**
 * Staff sign-in. Readers have no password form: they sign in with Google
 * (`/login/google`), so this action knows only the Gestion portal and a
 * crafted post cannot reach a reader account through it.
 */
export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const messages = messagesFor(await getLocale());

  const identifier = String(formData.get("identifier") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const fieldErrors: LoginState["fieldErrors"] = {};
  if (!identifier) {
    fieldErrors.identifier = fill(messages.identifierRequired, {
      label: messages.portals.gestion.identifierLabel,
    });
  }
  if (!password) {
    fieldErrors.password = messages.passwordRequired;
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  const result = await verifyStaffCredentials(identifier, password);

  if (result.status === "unavailable") {
    return { message: messages.backendUnavailable };
  }

  if (result.status === "invalid") {
    // Deliberately does not say which of the two was wrong.
    return { message: messages.badCredentials };
  }

  await createSession("gestion", result.principal);

  const next = formData.get("next");
  redirect(
    safeRedirect(
      typeof next === "string" ? next : undefined,
      PORTALS.gestion.defaultRedirect,
    ),
  );
}
