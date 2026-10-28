"use client";

import { useActionState } from "react";
import { fill, type Messages } from "@/lib/i18n";
import { PERMISSIONS } from "@/lib/permissions";
import type { RoleRow, StaffRow } from "@/lib/staff";
import { setRolesAction } from "../_actions";
import { STAFF_IDLE } from "../_lib/state";

const CHECK =
  "size-4 rounded border-border text-accent outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring";

const SAVE =
  "min-h-11 cluster items-center justify-center rounded-control bg-primary px-4 text-body-sm font-medium text-primary-foreground outline-offset-2 hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60";

/**
 * One shared action state for the whole table, not one per row: saving a row
 * re-renders the list, and row-scoped feedback would unmount before it could
 * be read. Same lesson as the reservations table.
 */
export function StaffTable({
  staff,
  roles,
  messages,
}: {
  staff: StaffRow[];
  roles: RoleRow[];
  messages: Messages;
}) {
  const [state, action, pending] = useActionState(setRolesAction, STAFF_IDLE);
  const s = messages.staff;

  return (
    <div className="stack gap-content">
      <p
        aria-live="polite"
        className={`text-caption ${
          state.kind === "ok"
            ? "text-success"
            : state.kind === "error"
              ? "text-danger"
              : "sr-only"
        }`}
      >
        {state.kind === "idle" ? "" : fill(s[state.key], state.values)}
      </p>

      <div className="overflow-x-auto rounded-card border border-border">
        <table className="w-full border-collapse text-body-sm">
          <thead>
            <tr className="bg-surface-muted text-left">
              <th className="px-3 py-2 font-medium">{s.colUser}</th>
              <th className="px-3 py-2 font-medium">{s.colRoles}</th>
              <th className="px-3 py-2 font-medium">{s.colPermissions}</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((user) => (
              <tr key={user.id} className="border-t border-border align-top">
                <td className="px-3 py-3">
                  <div className="stack gap-0.5">
                    <span className="font-medium">{user.name || user.username}</span>
                    <span className="font-mono text-caption text-foreground-muted">
                      {user.username}
                      {user.isActive ? "" : ` · ${s.inactive}`}
                    </span>
                  </div>
                </td>

                <td className="px-3 py-3">
                  <form action={action} className="stack gap-inline">
                    <input type="hidden" name="staffUserId" value={user.id} />
                    <input
                      type="hidden"
                      name="name"
                      value={user.name || user.username}
                    />
                    {roles.map((role) => (
                      <label key={role.id} className="cluster items-center gap-2">
                        <input
                          type="checkbox"
                          name="roleId"
                          value={role.id}
                          defaultChecked={user.roleIds.includes(role.id)}
                          className={CHECK}
                        />
                        <span>{role.name}</span>
                      </label>
                    ))}
                    <button type="submit" disabled={pending} className={`${SAVE} w-fit`}>
                      {s.save}
                    </button>
                  </form>
                </td>

                <td className="px-3 py-3">
                  {user.permissions.length === 0 ? (
                    <span className="text-caption text-danger">
                      {s.noPermissions}
                    </span>
                  ) : (
                    <ul className="stack gap-0.5 text-caption text-foreground-muted">
                      {user.permissions.map((permission) => (
                        <li key={permission}>{PERMISSIONS[permission]}</li>
                      ))}
                    </ul>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
