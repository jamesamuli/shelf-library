import { cache } from "react";
import { prisma } from "./prisma";
import { PERMISSION_KEYS, isPermission, type Permission } from "./permissions";

/**
 * Staff accounts and the roles they hold.
 *
 * Legacy edited `users.rights` one checkbox per bit, per user, in
 * `admin/users` — so every account was its own bespoke permission set and
 * nobody could say what "the assistant's access" meant. Here a role is the
 * unit you assign, and the permissions come with it.
 *
 * SERVER ONLY.
 */

/**
 * What one account may do, read fresh on every request rather than baked into
 * the session cookie: revoking a role has to take effect now, not at the
 * user's next sign-in. `cache` dedupes within a request, so a page that checks
 * five permissions still costs one query.
 */
export const permissionsFor = cache(
  async (staffUserId: number): Promise<Set<Permission>> => {
    if (!Number.isInteger(staffUserId)) return new Set();

    const rows = await prisma.rolePermission.findMany({
      where: { role: { users: { some: { staffUserId } } } },
      select: { permission: true },
      distinct: ["permission"],
    });

    // `role_permissions.permission` is free text, so a key that is no longer in
    // the catalogue is ignored rather than trusted.
    return new Set(rows.map((r) => r.permission).filter(isPermission));
  },
);

export async function can(
  staffUserId: number,
  permission: Permission,
): Promise<boolean> {
  return (await permissionsFor(staffUserId)).has(permission);
}

export type StaffRow = {
  id: number;
  username: string;
  name: string;
  isActive: boolean;
  roleIds: number[];
  permissions: Permission[];
};

export type RoleRow = {
  id: number;
  name: string;
  description: string | null;
  permissions: Permission[];
};

export type SetRolesResult =
  | { ok: true }
  | { ok: false; reason: "NOT_FOUND" | "LAST_ADMIN" };

export async function listStaff(): Promise<StaffRow[]> {
  const rows = await prisma.staffUser.findMany({
    select: {
      id: true,
      username: true,
      lastName: true,
      firstName: true,
      isActive: true,
      roles: {
        select: {
          role: { select: { id: true, permissions: { select: { permission: true } } } },
        },
      },
    },
    orderBy: { username: "asc" },
  });

  return rows.map((row) => ({
    id: row.id,
    username: row.username,
    name: [row.firstName, row.lastName].filter(Boolean).join(" "),
    isActive: row.isActive,
    roleIds: row.roles.map((r) => r.role.id),
    permissions: [
      ...new Set(
        row.roles.flatMap((r) =>
          r.role.permissions.map((p) => p.permission).filter(isPermission),
        ),
      ),
    ],
  }));
}

export async function listRoles(): Promise<RoleRow[]> {
  const rows = await prisma.role.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      permissions: { select: { permission: true } },
    },
    orderBy: { name: "asc" },
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    // Catalogue order, not insertion order, so every row reads the same way.
    permissions: PERMISSION_KEYS.filter((key) =>
      row.permissions.some((p) => p.permission === key),
    ),
  }));
}

/** Ids of the roles that carry `staff.manage`. */
async function adminRoleIds(): Promise<Set<number>> {
  const rows = await prisma.rolePermission.findMany({
    where: { permission: "staff.manage" },
    select: { roleId: true },
  });
  return new Set(rows.map((r) => r.roleId));
}

/**
 * Replace one account's roles.
 *
 * Refuses the change that leaves nobody able to manage accounts: there is no
 * recovery path from inside the app, and the only fix would be a database
 * script. Legacy had no such guard and locking yourself out was a known way
 * to lose an afternoon.
 */
export async function setRoles(
  staffUserId: number,
  roleIds: number[],
): Promise<SetRolesResult> {
  const user = await prisma.staffUser.findUnique({
    where: { id: staffUserId },
    select: { id: true },
  });
  if (!user) return { ok: false, reason: "NOT_FOUND" };

  const admins = await adminRoleIds();
  const keepsAdmin = roleIds.some((id) => admins.has(id));

  if (!keepsAdmin) {
    const otherAdmins = await prisma.staffUserRole.count({
      where: { roleId: { in: [...admins] }, staffUserId: { not: staffUserId } },
    });
    if (otherAdmins === 0) return { ok: false, reason: "LAST_ADMIN" };
  }

  await prisma.$transaction([
    prisma.staffUserRole.deleteMany({
      where: { staffUserId, roleId: { notIn: roleIds } },
    }),
    prisma.staffUserRole.createMany({
      data: roleIds.map((roleId) => ({ staffUserId, roleId })),
      skipDuplicates: true,
    }),
  ]);

  return { ok: true };
}
