import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { PortalSlug } from "./portals";

/**
 * Stateless signed-cookie sessions, replacing legacy's server-side PHP
 * sessions (`includes/sessions.inc.php` + the `sessions` table).
 *
 * Gestion and OPAC get separate cookies, so a librarian signed into the back
 * office and a patron signed into the catalog on the same browser do not
 * evict each other — legacy kept these separate too.
 */

const SESSION_TTL_SECONDS = 60 * 60 * 8;

type SessionPayload = {
  /** Principal id. */
  sub: string;
  name: string;
  portal: PortalSlug;
  /** True for the whole session that followed the account's first sign-in. */
  firstLogin: boolean;
  /** Expiry, seconds since epoch. */
  exp: number;
};

function cookieName(portal: PortalSlug) {
  return `pmb_${portal}_session`;
}

/**
 * Remembers that *this device* has completed a sign-in at least once, so the
 * login screen can greet a first-time visitor with "Welcome" instead of
 * "Welcome back".
 *
 * Device-scoped rather than account-scoped by necessity: the greeting is
 * rendered before anyone has identified themselves, so there is no account to
 * look up yet. It deliberately survives sign-out — having signed out does not
 * make you a first-time visitor.
 */
const RETURNING_COOKIE = "pmb_returning";
const RETURNING_MAX_AGE = 60 * 60 * 24 * 365;

export async function hasSignedInBefore() {
  return (await cookies()).get(RETURNING_COOKIE)?.value === "1";
}

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value) {
    throw new Error(
      "AUTH_SECRET is not set. Generate one with `openssl rand -base64 32`.",
    );
  }
  return value;
}

function base64url(input: Buffer | string) {
  return Buffer.from(input).toString("base64url");
}

function sign(body: string) {
  return createHmac("sha256", secret()).update(body).digest("base64url");
}

function encode(payload: SessionPayload) {
  const body = base64url(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

function decode(token: string): SessionPayload | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expected = Buffer.from(sign(body));
  const received = Buffer.from(signature);
  // timingSafeEqual throws on length mismatch, so check that first.
  if (expected.length !== received.length) return null;
  if (!timingSafeEqual(expected, received)) return null;

  const payload = JSON.parse(
    Buffer.from(body, "base64url").toString(),
  ) as SessionPayload;
  if (payload.exp * 1000 < Date.now()) return null;
  return payload;
}

export async function createSession(
  portal: PortalSlug,
  principal: { id: string; displayName: string; isFirstLogin: boolean },
) {
  const payload: SessionPayload = {
    sub: principal.id,
    name: principal.displayName,
    portal,
    firstLogin: principal.isFirstLogin,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };

  const cookieStore = await cookies();
  cookieStore.set(cookieName(portal), encode(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });

  // Only ever set after credentials actually verified.
  cookieStore.set(RETURNING_COOKIE, "1", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: RETURNING_MAX_AGE,
  });
}

export async function getSession(portal: PortalSlug) {
  const token = (await cookies()).get(cookieName(portal))?.value;
  return token ? decode(token) : null;
}

export async function destroySession(portal: PortalSlug) {
  (await cookies()).delete(cookieName(portal));
}

/** Guard for pages that require a signed-in principal for `portal`. */
export async function requireSession(portal: PortalSlug) {
  const session = await getSession(portal);
  if (!session) redirect(`/login/${portal}`);
  return session;
}
