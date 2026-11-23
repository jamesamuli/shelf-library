/**
 * The results' layout. A preference kept in a cookie rather than in the
 * URL, so switching it is instant — no new page, no new request — and the
 * next page of results opens in the same layout.
 */
export const VIEWS = ["etendu", "liste"] as const;
export type View = (typeof VIEWS)[number];

export const VIEW_COOKIE = "catalogue-view";

export const isView = (value: unknown): value is View => (VIEWS as readonly unknown[]).includes(value);
