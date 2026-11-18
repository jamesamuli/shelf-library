/**
 * Where a popup Google sign-in reports its outcome to the page that opened
 * it. Its own module because google.ts uses node:crypto and must stay
 * server-side, while the sign-in button needs this name in the browser.
 */
export const HANDOFF_CHANNEL = "pmb-google-signin";
