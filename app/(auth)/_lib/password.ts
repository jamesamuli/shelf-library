import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

/**
 * Password hashing with scrypt from node:crypto — memory-hard, and no
 * dependency to add. A deliberate break from legacy, which hashed staff
 * passwords as unsalted double-SHA1 (MySQL's `PASSWORD()`) into a
 * varchar(50), and allowed patron passwords to be stored in plaintext.
 *
 * Format: scrypt$N$r$p$salt_b64$key_b64 — parameters travel with the hash, so
 * they can be raised later without invalidating existing hashes.
 */

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number },
) => Promise<Buffer>;

const KEY_LENGTH = 64;
const PARAMS = { N: 16384, r: 8, p: 1 };

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(
    password.normalize("NFKC"),
    salt,
    KEY_LENGTH,
    PARAMS,
  );
  return [
    "scrypt",
    PARAMS.N,
    PARAMS.r,
    PARAMS.p,
    salt.toString("base64"),
    key.toString("base64"),
  ].join("$");
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const [, n, r, p, saltB64, keyB64] = parts;
  const salt = Buffer.from(saltB64, "base64");
  const expected = Buffer.from(keyB64, "base64");
  if (expected.length === 0) return false;

  const key = await scryptAsync(
    password.normalize("NFKC"),
    salt,
    expected.length,
    { N: Number(n), r: Number(r), p: Number(p) },
  );
  if (key.length !== expected.length) return false;
  return timingSafeEqual(key, expected);
}

let dummyHash: Promise<string> | null = null;

/**
 * Burns roughly the same time as a real verification. Called when no account
 * matches, so response time does not reveal whether an identifier exists.
 */
export async function burnVerificationTime(password: string): Promise<void> {
  dummyHash ??= hashPassword(randomBytes(32).toString("hex"));
  await verifyPassword(password, await dummyHash);
}
