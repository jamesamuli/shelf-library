import { cookies, headers } from "next/headers";

/**
 * User preferences held in cookies so the server renders the correct theme and
 * language on the first paint — no flash of the wrong theme, and no
 * client-side i18n runtime.
 *
 * With no cookie yet, a phone starts from its own settings (CDI request): its
 * language from `Accept-Language`, and its light or dark mode, which only the
 * browser knows — so the theme is left to CSS (`prefers-color-scheme`) rather
 * than guessed. Desktops keep the fixed defaults below. A choice made with the
 * switches is a cookie, and always wins.
 */

export const THEMES = ["light", "dark"] as const;
export type Theme = (typeof THEMES)[number];
/** "system": no choice made yet on a phone — follow its light/dark mode. */
export type ThemeSetting = Theme | "system";

export const LOCALES = ["fr", "en"] as const;
export type Locale = (typeof LOCALES)[number];

/** On desktop, the app opens in light mode regardless of the OS setting. */
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

/**
 * A phone, by its client hint (Chromium) or, failing that, its user agent.
 * Tablets mostly announce themselves as desktops and get desktop defaults.
 */
async function isPhone() {
  const request = await headers();
  if (request.get("sec-ch-ua-mobile") === "?1") return true;
  return /Mobi|iPhone|iPod|Android.+Mobile/i.test(request.get("user-agent") ?? "");
}

/** The first of our locales the browser asks for, by its `q` order. */
function preferredLocale(acceptLanguage: string | null): Locale | null {
  const ranked = (acceptLanguage ?? "")
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((param) => param.trim().startsWith("q="));
      return { language: tag.split("-")[0].toLowerCase(), q: q ? Number(q.trim().slice(2)) : 1 };
    })
    .filter((entry) => entry.language && entry.q > 0)
    .sort((a, b) => b.q - a.q);
  return ranked.map((entry) => entry.language).find(isLocale) ?? null;
}

export async function getTheme(): Promise<ThemeSetting> {
  const value = (await cookies()).get(THEME_COOKIE)?.value;
  if (value && isTheme(value)) return value;
  return (await isPhone()) ? "system" : DEFAULT_THEME;
}

export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (value && isLocale(value)) return value;
  if (await isPhone()) {
    return preferredLocale((await headers()).get("accept-language")) ?? DEFAULT_LOCALE;
  }
  return DEFAULT_LOCALE;
}
