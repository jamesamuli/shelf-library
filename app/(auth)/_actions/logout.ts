"use server";

import { redirect } from "next/navigation";
import { destroySession } from "../_lib/session";
import { isPortalSlug } from "../_lib/portals";

export async function logout(formData: FormData) {
  const portal = String(formData.get("portal") ?? "");
  if (!isPortalSlug(portal)) redirect("/login");

  await destroySession(portal);
  redirect(`/login/${portal}`);
}
