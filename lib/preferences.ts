import { cookies } from "next/headers";

/**
 * User preferences held in cookies so the server renders the correct theme and
 * language on the first paint — no flash of the wrong theme, and no
 * client-side i18n runtime.
 */

export const THEMES = ["light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

export const LOCALES = ["fr", "en"] as const;
export type Locale = (typeof LOCALES)[number];

/** The app opens in light mode regardless of the OS setting. */
export const DEFAULT_THEME: Theme = "light";
export const DEFAULT_LOCALE: Locale = "fr";

export const THEME_COOKIE = "theme";
export const LOCALE_COOKIE = "locale";
export const PREFERENCE_MAX_AGE = 60 * 60 * 24 * 365;

export function isTheme(value: string): value is Theme {
  return (THEMES as readonly string[]).includes(value);
}

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export async function getTheme(): Promise<Theme> {
  const value = (await cookies()).get(THEME_COOKIE)?.value;
  return value && isTheme(value) ? value : DEFAULT_THEME;
}

export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return value && isLocale(value) ? value : DEFAULT_LOCALE;
}
