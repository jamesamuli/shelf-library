import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import {
  authorizeUrl,
  CALLBACK_PATH,
  encodeFlow,
  FLOW_COOKIE,
  FLOW_MAX_AGE,
  googleConfig,
  newFlow,
} from "../../_lib/google";

/**
 * Starts a Google sign-in: remembers the flow, then hands over to Google.
 * `?popup=1` when the sign-in button opened this in a popup window, so the
 * callback ends with the hand-off page rather than a redirect.
 */
export async function GET(request: NextRequest) {
  const config = googleConfig();
  if (!config) redirect("/login/opac?google=unavailable");

  const params = request.nextUrl.searchParams;
  const flow = newFlow(params.get("next") ?? undefined, params.get("popup") === "1");
  (await cookies()).set(FLOW_COOKIE, encodeFlow(flow), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // Lax, not strict: Google's redirect back is a cross-site navigation, and
    // a strict cookie would not travel with it.
    sameSite: "lax",
    path: "/login/google",
    maxAge: FLOW_MAX_AGE,
  });

  const redirectUri = new URL(CALLBACK_PATH, request.nextUrl.origin).toString();
  redirect(authorizeUrl(config, flow, redirectUri).toString());
}
