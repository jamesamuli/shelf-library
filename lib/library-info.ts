import type { Locale } from "./preferences";

type Text = Record<Locale, string>;

/**
 * The CDI's own practical details, shown in "Infos pratiques" on the
 * catalogue home. None of it can be derived from the catalogue, so it is
 * written here — by the CDI — until a settings screen exists
 * (docs/09-deferred.md 4.16). A block shows only once it is filled in: an
 * empty list or a null hides it, so the page never claims opening hours or
 * contact details that nobody wrote.
 *
 * For example:
 *   hours: [{ days: { fr: "Lundi – vendredi", en: "Monday – Friday" }, time: "7 h 30 – 16 h 30" }],
 *   place: { fr: "Bâtiment B, rez-de-chaussée", en: "Building B, ground floor" },
 *   email: "cdi@efbujumbura.com",
 */
export const LIBRARY_INFO: {
  hours: { days: Text; time: string }[];
  place: Text | null;
  email: string | null;
  phone: string | null;
} = {
  hours: [],
  place: null,
  email: null,
  phone: null,
};
