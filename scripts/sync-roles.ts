import "dotenv/config";
import { prisma } from "../lib/prisma";
import { ROLE_DEFINITIONS } from "../lib/roles";

/**
 * Brings the roles table in line with lib/roles.ts. Idempotent, and safe to
 * re-run after changing a role's permissions.
 *
 *   npx tsx scripts/sync-roles.ts
 *
 * Role *assignments* are left alone: who holds which role is operational data,
 * not something this script should decide.
 */
async function main() {
  for (const definition of ROLE_DEFINITIONS) {
    const role = await prisma.role.upsert({
      where: { name: definition.name },
      update: { description: definition.description },
      create: { name: definition.name, description: definition.description },
    });

    // Replace wholesale: a permission dropped from the definition must also
    // disappear from the database, or revoking one would never take effect.
    await prisma.rolePermission.deleteMany({
      where: { roleId: role.id, permission: { notIn: definition.permissions } },
    });
    await prisma.rolePermission.createMany({
      data: definition.permissions.map((permission) => ({
        roleId: role.id,
        permission,
      })),
      skipDuplicates: true,
    });

    console.log(`  ${definition.name.padEnd(22)} ${definition.permissions.length} permissions`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
