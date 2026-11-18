import { prisma } from "@/lib/prisma";
import { burnVerificationTime, verifyPassword } from "./password";

/**
 * The only place authentication touches the database.
 *
 * Staff authenticate with `staff_users.username` and a password. Readers sign
 * in with their school Google account only (CDI decision, 2026-11-18), found
 * by `patrons.email`; legacy's card-number + password sign-in is gone.
 *
 * Every staff rejection returns a bare `invalid` with no reason, and every
 * path that fails to find an account still burns comparable time, so neither
 * the response body nor its timing reveals whether a username exists.
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

export async function verifyStaffCredentials(
  username: string,
  password: string,
): Promise<CredentialResult> {
  try {
    return await verifyStaff(username, password);
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

type PatronWithStatus = NonNullable<
  Awaited<ReturnType<typeof findPatron>>
>;

function findPatron(email: string) {
  return prisma.patron.findUnique({ where: { email }, include: { status: true } });
}

/** Who may use the OPAC at all. */
function mayUseOpac(patron: PatronWithStatus) {
  // Compared as dates, not timestamps: expiresOn/blockedUntil are DATE columns.
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    patron.anonymizedAt === null &&
    patron.status?.allowsOpacLogin !== false &&
    (patron.expiresOn === null || patron.expiresOn >= today) &&
    (patron.blockedUntil === null || patron.blockedUntil < today)
  );
}

async function signInPatron(patron: PatronWithStatus): Promise<CredentialResult> {
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

/**
 * Google sign-in: the address has already been proven by Google and checked
 * against the school domain (see google.ts), so the reader is found by the
 * email their account was created from. No password, so no timing to equalise
 * — and the address is the reader's own, so saying it has no account reveals
 * nothing they could not already know.
 */
export async function verifyPatronByEmail(email: string): Promise<CredentialResult> {
  try {
    const patron = await findPatron(email);
    if (!patron || !mayUseOpac(patron)) return INVALID;
    return await signInPatron(patron);
  } catch (error) {
    console.error("Credential verification failed:", error);
    return { status: "unavailable" };
  }
}
