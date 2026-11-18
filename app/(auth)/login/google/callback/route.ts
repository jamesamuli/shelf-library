import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { verifyPatronByEmail } from "../../../_lib/credentials";
import {
  CALLBACK_PATH,
  checkIdToken,
  decodeFlow,
  exchangeCode,
  FLOW_COOKIE,
  googleConfig,
  handoffPage,
  type GoogleFailure,
} from "../../../_lib/google";
import { PORTALS, safeRedirect } from "../../../_lib/portals";
import { createSession } from "../../../_lib/session";
import { messagesFor } from "@/lib/i18n";
import { getLocale } from "@/lib/preferences";

/**
 * Google sends the reader back here with a one-time code. Every check fails
 * closed onto the reader panel; only a verified school address that belongs
 * to an eligible reader gets a session.
 *
 * A sign-in started in a popup ends on the hand-off page, which sends the
 * page that opened it to the same place a redirect would have gone, then
 * closes. A flow too old to say (its cookie gone) ends with a redirect.
 */
export async function GET(request: NextRequest) {
  const store = await cookies();
  const flow = decodeFlow(store.get(FLOW_COOKIE)?.value);
  // Single use, whatever happens next.
  store.delete({ name: FLOW_COOKIE, path: "/login/google" });

  const messages = messagesFor(await getLocale());
  const finish = (to: string, message: string) =>
    flow?.popup ? handoffPage(to, message) : redirect(to);
  // Back on the reader panel, which explains the failure.
  const fail = (reason: GoogleFailure) =>
    finish(`/login/opac?google=${reason}`, messages.google.errors[reason]);

  const config = googleConfig();
  if (!config) return fail("unavailable");

  const params = request.nextUrl.searchParams;
  // `error` is how Google reports the reader backing out (access_denied).
  if (params.get("error")) return fail("cancelled");

  const code = params.get("code");
  // The state must match the one this browser started with, or the answer
  // belongs to someone else's sign-in (login CSRF).
  if (!flow || !code || params.get("state") !== flow.state) return fail("invalid");

  let idToken: string;
  try {
    const redirectUri = new URL(CALLBACK_PATH, request.nextUrl.origin).toString();
    idToken = await exchangeCode(config, code, flow.verifier, redirectUri);
  } catch (error) {
    console.error("Google sign-in failed:", error);
    return fail("unavailable");
  }

  const check = checkIdToken(idToken, { clientId: config.clientId, nonce: flow.nonce });
  if (!check.ok) return fail(check.reason);

  const result = await verifyPatronByEmail(check.email);
  if (result.status === "unavailable") return fail("unavailable");
  if (result.status === "invalid") return fail("no-account");

  await createSession("opac", result.principal);
  return finish(safeRedirect(flow.next, PORTALS.opac.defaultRedirect), messages.google.signedIn);
}
