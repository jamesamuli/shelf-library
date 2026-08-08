/**
 * The two entry points into Shelf Library, mirroring the legacy split between
 * the back office (root `index.php`, authenticates on `users.username`) and
 * the public catalog (`opac_css/`, authenticates on the patron card number
 * `empr.empr_cb`). Identifier semantics differ per portal — that is the one
 * legacy behavior worth preserving exactly.
 *
 * The brand kit's UI mockups label the public portal "OPUS"; we keep the
 * standard library term OPAC instead, by decision.
 *
 * Only non-textual configuration lives here. All user-facing strings —
 * portal names, field labels, placeholders — are in lib/i18n.ts so they can
 * be translated.
 */

export type PortalSlug = "gestion" | "opac";

export type Portal = {
  slug: PortalSlug;
  /** Helps password managers fill the right field. */
  identifierAutoComplete: "username";
  /** Card numbers are numeric — surfaces a numeric keypad on mobile. */
  identifierInputMode?: "numeric";
  /** Where a successful sign-in lands, unless a safe `?next=` overrides it. */
  defaultRedirect: string;
};

export const PORTALS: Record<PortalSlug, Portal> = {
  gestion: {
    slug: "gestion",
    identifierAutoComplete: "username",
    defaultRedirect: "/gestion",
  },
  opac: {
    slug: "opac",
    identifierAutoComplete: "username",
    identifierInputMode: "numeric",
    defaultRedirect: "/catalogue/compte",
  },
};

export const PORTAL_SLUGS: PortalSlug[] = ["gestion", "opac"];

export function isPortalSlug(value: string): value is PortalSlug {
  return value === "gestion" || value === "opac";
}

/**
 * Legacy carried a `ret_url` through the login form. Same idea, but only
 * same-site absolute paths are honored — anything else is an open redirect.
 */
export function safeRedirect(next: string | undefined, fallback: string) {
  if (!next) return fallback;
  if (!next.startsWith("/") || next.startsWith("//")) return fallback;
  return next;
}
