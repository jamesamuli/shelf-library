import { createHash, randomBytes } from "node:crypto";
import { HANDOFF_CHANNEL } from "./google-channel";

/**
 * "Se connecter avec Google" for readers: OpenID Connect's authorization-code
 * flow with PKCE, against Google directly — a few requests do not justify an
 * auth library on top of the session we already have.
 *
 * Only school accounts get in. Every student has an @efbujumbura.com Google
 * Workspace account, and that address is the one their reader account was
 * created from (patrons.email), so it is both the gate and the lookup key.
 */

export const SCHOOL_DOMAIN = "efbujumbura.com";

const AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const ISSUERS = new Set(["https://accounts.google.com", "accounts.google.com"]);

/** Where the callback lives, relative to the site's own origin. */
export const CALLBACK_PATH = "/login/google/callback";

/** Holds state, nonce, PKCE verifier and `next` across the round trip. */
export const FLOW_COOKIE = "pmb_google_flow";
export const FLOW_MAX_AGE = 10 * 60;

export type GoogleConfig = { clientId: string; clientSecret: string };

/** Why a Google sign-in was turned back; travels as `?google=` to the panel. */
export const GOOGLE_FAILURES = [
  "cancelled",
  "invalid",
  "domain",
  "no-account",
  "unavailable",
] as const;
export type GoogleFailure = (typeof GOOGLE_FAILURES)[number];

export function isGoogleFailure(value: unknown): value is GoogleFailure {
  return (GOOGLE_FAILURES as readonly unknown[]).includes(value);
}

/** Null until both are set: the button is not offered without them. */
export function googleConfig(): GoogleConfig | null {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

/** `popup`: the sign-in runs in a popup window (see handoffPage). */
export type Flow = {
  state: string;
  nonce: string;
  verifier: string;
  next?: string;
  popup?: boolean;
};

const random = () => randomBytes(32).toString("base64url");

export function newFlow(next: string | undefined, popup: boolean): Flow {
  return { state: random(), nonce: random(), verifier: random(), next, popup };
}

/**
 * The popup's last page: tells the sign-in page where to go — the reader's
 * destination, or the panel with the failure — then closes.
 *
 * It speaks over a BroadcastChannel, not `window.opener`: Google's sign-in
 * pages cut the popup off from its opener on the way through (their
 * Cross-Origin-Opener-Policy), so the opener is gone by the time the popup
 * returns. A same-origin channel survives that. Should the window refuse to
 * close (or nobody be listening), it carries on to the destination itself;
 * without JavaScript, the meta refresh does.
 *
 * `to` is always a same-site path the callback built or vetted with
 * safeRedirect; it is still escaped for both places it is written.
 */
export function handoffPage(to: string, message: string) {
  const forHtml = to.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  // Written out as backslash-u003c: a "<" can then never close the script.
  const forScript = JSON.stringify(to).replace(/</g, "\\u003c");
  const channel = JSON.stringify(HANDOFF_CHANNEL);
  const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Shelf Library</title><noscript><meta http-equiv="refresh" content="0;url=${forHtml}"></noscript></head>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui,sans-serif;color:#111827;background:#fff">
<p>${message.replace(/</g, "&lt;")}</p>
<script>
(function () {
  var to = ${forScript};
  try { var c = new BroadcastChannel(${channel}); c.postMessage({ to: to }); c.close(); } catch (e) {}
  window.close();
  setTimeout(function () { location.replace(to); }, 600);
})();
</script></body></html>`;
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export function encodeFlow(flow: Flow) {
  return Buffer.from(JSON.stringify(flow)).toString("base64url");
}

export function decodeFlow(value: string | undefined): Flow | null {
  if (!value) return null;
  try {
    const flow = JSON.parse(Buffer.from(value, "base64url").toString()) as Flow;
    return typeof flow.state === "string" &&
      typeof flow.nonce === "string" &&
      typeof flow.verifier === "string"
      ? flow
      : null;
  } catch {
    return null;
  }
}

export function authorizeUrl(config: GoogleConfig, flow: Flow, redirectUri: string) {
  const url = new URL(AUTHORIZE_URL);
  url.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state: flow.state,
    nonce: flow.nonce,
    code_challenge: createHash("sha256").update(flow.verifier).digest("base64url"),
    code_challenge_method: "S256",
    // Only a hint — it filters Google's account picker, nothing more. The
    // real check is on the token, in checkIdToken.
    hd: SCHOOL_DOMAIN,
    prompt: "select_account",
  }).toString();
  return url;
}

/** Trades the one-time code for the ID token. */
export async function exchangeCode(
  config: GoogleConfig,
  code: string,
  verifier: string,
  redirectUri: string,
): Promise<string> {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
      code_verifier: verifier,
    }),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Google token endpoint answered ${response.status}: ${await response.text()}`);
  }
  const { id_token: idToken } = (await response.json()) as { id_token?: string };
  if (!idToken) throw new Error("Google token response had no id_token");
  return idToken;
}

export type IdTokenCheck =
  { ok: true; email: string } | { ok: false; reason: "invalid" | "domain" };

/**
 * Validates the ID token's claims (OpenID Connect Core §3.1.3.7). The token
 * came straight from Google's token endpoint over TLS, in exchange for a code
 * only we could redeem, which the spec accepts in place of checking its
 * signature — so the claims are what is left to check.
 *
 * The domain is checked three ways, all required: Google must vouch that the
 * address is verified, that the account belongs to the school's Workspace
 * (`hd`, which a personal Gmail account never carries), and the address itself
 * must be on the school domain.
 */
export function checkIdToken(
  idToken: string,
  expected: { clientId: string; nonce: string; now?: number },
): IdTokenCheck {
  let claims: Record<string, unknown>;
  try {
    claims = JSON.parse(Buffer.from(idToken.split(".")[1] ?? "", "base64url").toString());
  } catch {
    return { ok: false, reason: "invalid" };
  }

  const now = Math.floor((expected.now ?? Date.now()) / 1000);
  const valid =
    typeof claims.iss === "string" &&
    ISSUERS.has(claims.iss) &&
    claims.aud === expected.clientId &&
    typeof claims.exp === "number" &&
    claims.exp > now &&
    claims.nonce === expected.nonce;
  if (!valid) return { ok: false, reason: "invalid" };

  const email = typeof claims.email === "string" ? claims.email.trim().toLowerCase() : "";
  const onSchoolDomain =
    claims.email_verified === true &&
    claims.hd === SCHOOL_DOMAIN &&
    email.endsWith(`@${SCHOOL_DOMAIN}`);
  return onSchoolDomain ? { ok: true, email } : { ok: false, reason: "domain" };
}
