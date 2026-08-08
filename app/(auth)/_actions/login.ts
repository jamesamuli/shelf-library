"use server";

import { redirect } from "next/navigation";
import { fill, messagesFor } from "@/lib/i18n";
import { getLocale } from "@/lib/preferences";
import { verifyCredentials } from "../_lib/credentials";
import { createSession } from "../_lib/session";
import { isPortalSlug, PORTALS, safeRedirect } from "../_lib/portals";

export type LoginState = {
  /** Shown in the form-level alert. */
  message?: string;
  fieldErrors?: {
    identifier?: string;
    password?: string;
  };
};

export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const messages = messagesFor(await getLocale());

  const portalSlug = String(formData.get("portal") ?? "");
  if (!isPortalSlug(portalSlug)) {
    return { message: messages.unknownPortal };
  }
  const portal = PORTALS[portalSlug];

  const identifier = String(formData.get("identifier") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const fieldErrors: LoginState["fieldErrors"] = {};
  if (!identifier) {
    fieldErrors.identifier = fill(messages.identifierRequired, {
      label: messages.portals[portalSlug].identifierLabel,
    });
  }
  if (!password) {
    fieldErrors.password = messages.passwordRequired;
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  const result = await verifyCredentials(portalSlug, identifier, password);

  if (result.status === "unavailable") {
    return { message: messages.backendUnavailable };
  }

  if (result.status === "invalid") {
    // Deliberately does not say which of the two was wrong.
    return { message: messages.badCredentials };
  }

  await createSession(portalSlug, result.principal);

  const next = formData.get("next");
  redirect(
    safeRedirect(
      typeof next === "string" ? next : undefined,
      portal.defaultRedirect,
    ),
  );
}
