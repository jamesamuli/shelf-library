"use server";

import { revalidatePath } from "next/cache";
import { setRoles } from "@/lib/staff";
import type { StaffState } from "./_lib/state";
import { requirePermission } from "../../(auth)/_lib/session";

export async function setRolesAction(
  _previous: StaffState,
  formData: FormData,
): Promise<StaffState> {
  await requirePermission("staff.manage");

  const staffUserId = Number(formData.get("staffUserId"));
  if (!Number.isInteger(staffUserId)) {
    return { kind: "error", key: "errNotFound", values: {} };
  }

  // Unchecked boxes are simply absent from the payload, so this is the
  // complete new set rather than a delta.
  const roleIds = formData
    .getAll("roleId")
    .map(Number)
    .filter(Number.isInteger);

  const result = await setRoles(staffUserId, roleIds);
  if (!result.ok) {
    return {
      kind: "error",
      key: result.reason === "LAST_ADMIN" ? "errLastAdmin" : "errNotFound",
      values: {},
    };
  }

  revalidatePath("/gestion/personnel");
  return {
    kind: "ok",
    key: "saved",
    values: { name: String(formData.get("name") ?? "") },
  };
}
