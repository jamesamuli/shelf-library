import { prisma } from "@/lib/prisma";
import { burnVerificationTime, verifyPassword } from "./password";
import type { PortalSlug } from "./portals";

/**
 * The only place authentication touches the database.
 *
 * Gestion authenticates on `staff_users.username`, OPAC on `patrons.barcode`
 * (the card number) — the one legacy behavior worth preserving exactly.
 *
 * Every rejection returns a bare `invalid` with no reason, and every path that
 * fails to find an account still burns comparable time, so neither the
 * response body nor its timing reveals whether an identifier exists.
 */

export type Principal = {
  id: string;
  displayName: string;
  /** True when this is the account's first-ever successful sign-in. */
  isFirstLogin: boolean;
};

export type CredentialResult =
  | { status: "ok"; principal: Principal }
  | { status: "invalid" }
  | { status: "unavailable" };

const INVALID = { status: "invalid" } as const;

export async function verifyCredentials(
  portal: PortalSlug,
  identifier: string,
  password: string,
): Promise<CredentialResult> {
  try {
    return portal === "gestion"
      ? await verifyStaff(identifier, password)
      : await verifyPatron(identifier, password);
  } catch (error) {
    // Database unreachable or misconfigured — distinct from bad credentials,
    // so the form can say so instead of blaming the user's password.
    console.error("Credential verification failed:", error);
    return { status: "unavailable" };
  }
}

async function verifyStaff(
  username: string,
  password: string,
): Promise<CredentialResult> {
  const user = await prisma.staffUser.findUnique({ where: { username } });

  if (!user || !user.isActive) {
    await burnVerificationTime(password);
    return INVALID;
  }

  if (!(await verifyPassword(password, user.passwordHash))) return INVALID;

  // Read before the update: null means this is the first-ever sign-in.
  const isFirstLogin = user.lastLoginAt === null;
  await prisma.staffUser.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return {
    status: "ok",
    principal: {
      id: String(user.id),
      displayName: [user.firstName, user.lastName].filter(Boolean).join(" "),
      isFirstLogin,
    },
  };
}

async function verifyPatron(
  barcode: string,
  password: string,
): Promise<CredentialResult> {
  const patron = await prisma.patron.findUnique({
    where: { barcode },
    include: { status: true },
  });

  // Compared as dates, not timestamps: expiresOn/blockedUntil are DATE columns.
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const ineligible =
    !patron ||
    !patron.passwordHash ||
    patron.anonymizedAt !== null ||
    patron.status?.allowsOpacLogin === false ||
    (patron.expiresOn !== null && patron.expiresOn < today) ||
    (patron.blockedUntil !== null && patron.blockedUntil >= today);

  if (ineligible) {
    await burnVerificationTime(password);
    return INVALID;
  }

  if (!(await verifyPassword(password, patron.passwordHash!))) return INVALID;

  const isFirstLogin = patron.lastLoginAt === null;
  await prisma.patron.update({
    where: { id: patron.id },
    data: { lastLoginAt: new Date() },
  });

  return {
    status: "ok",
    principal: {
      id: String(patron.id),
      displayName: [patron.firstName, patron.lastName]
        .filter(Boolean)
        .join(" "),
      isFirstLogin,
    },
  };
}
