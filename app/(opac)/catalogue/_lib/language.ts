import type { Locale } from "@/lib/preferences";

/** Records carry MARC/ISO 639-2 bibliographic codes; Intl names two-letter ones. */
const TWO_LETTER: Record<string, string> = {
  fre: "fr", eng: "en", ger: "de", spa: "es", ita: "it", por: "pt", ara: "ar", dut: "nl", chi: "zh",
};

/** "fre" → "Français" (or "French"), capitalised; the code itself if unknown. */
export function languageName(code: string, locale: Locale) {
  try {
    const name = new Intl.DisplayNames([locale], { type: "language" }).of(TWO_LETTER[code] ?? code);
    return name ? name.charAt(0).toLocaleUpperCase(locale) + name.slice(1) : code;
  } catch {
    return code;
  }
}
