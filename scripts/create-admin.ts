import { randomBytes } from "node:crypto";
import { prisma } from "../lib/prisma";
import { hashPassword } from "../app/(auth)/_lib/password";

/**
 * Creates (or resets) an administrator account for the Gestion portal.
 *
 * Idempotent: re-running sets the password to the resolved value, so what is
 * printed is always what works.
 *
 *   ADMIN_USERNAME=admin ADMIN_PASSWORD=... npx tsx scripts/create-admin.ts
 *
 * Without ADMIN_PASSWORD a random one is generated and printed once — never
 * hardcode a password here.
 */
const username = process.env.ADMIN_USERNAME ?? "admin";
const password = process.env.ADMIN_PASSWORD ?? randomBytes(9).toString("base64url");
const generated = !process.env.ADMIN_PASSWORD;

async function main() {
  const passwordHash = await hashPassword(password);

  const admin = await prisma.staffUser.upsert({
    where: { username },
    update: { passwordHash, isActive: true },
    create: {
      username,
      passwordHash,
      lastName: "Administrateur",
      email: "admin@example.invalid",
    },
  });

  // The role is recorded now so the account is correct in the data model;
  // nothing reads it yet (docs/09-deferred.md item 3.1).
  const role = await prisma.role.upsert({
    where: { name: "Administrateur" },
    update: {},
    create: {
      name: "Administrateur",
      description: "Accès complet à la gestion.",
    },
  });

  await prisma.staffUserRole.upsert({
    where: { staffUserId_roleId: { staffUserId: admin.id, roleId: role.id } },
    update: {},
    create: { staffUserId: admin.id, roleId: role.id },
  });

  console.log("Gestion administrator ready.");
  console.log(`  username  ${admin.username}`);
  console.log(`  password  ${password}${generated ? "  (generated — save it now)" : "  (from env)"}`);
  console.log(`  sign in   http://localhost:3000/login/gestion`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

