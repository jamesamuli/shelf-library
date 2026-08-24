import type { Locale } from "./preferences";

const TAGS: Record<Locale, string> = { fr: "fr-FR", en: "en-GB" };

/**
 * Dates cross the server/client boundary as strings, and `due_on` is a
 * date-only column that Prisma hands back at UTC midnight — formatting it in
 * the server's local zone would show the previous day west of Greenwich.
 */
export function formatDate(value: Date | string, locale: Locale): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleDateString(TAGS[locale], {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
