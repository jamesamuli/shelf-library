"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  isLocale,
  isTheme,
  LOCALE_COOKIE,
  PREFERENCE_MAX_AGE,
  THEME_COOKIE,
} from "./preferences";

// Separate from preferences.ts because "use server" makes every export an
// action, and that file also exports types and constants.

async function setPreference(name: string, value: string) {
  (await cookies()).set(name, value, {
    path: "/",
    maxAge: PREFERENCE_MAX_AGE,
    sameSite: "lax",
  });
  // The theme and language are read in the root layout, so the whole tree
  // has to re-render for the change to show.
  revalidatePath("/", "layout");
}

export async function setTheme(formData: FormData) {
  const value = String(formData.get("theme") ?? "");
  if (isTheme(value)) await setPreference(THEME_COOKIE, value);
}

export async function setLocale(formData: FormData) {
  const value = String(formData.get("locale") ?? "");
  if (isLocale(value)) await setPreference(LOCALE_COOKIE, value);
}
