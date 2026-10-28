/**
 * Who may do what in the back office.
 *
 * Legacy stored this as `users.rights`, a 27-bit mask in `includes/config.inc.php`
 * (CIRCULATION_AUTH = 1, CATALOGAGE_AUTH = 2, ...), checked once per entry point:
 * `circ.php` set `$base_auth = "CIRCULATION_AUTH"` and `checkUser()` did
 * `if (!($allow & $session->rights)) return FALSE`. One bit per *module*, tested
 * at the door and never again — so anyone who could open Circulation could do
 * everything inside it, deletions included.
 *
 * We keep the shape (a set of capabilities per user) and drop the bitmask: keys
 * are strings in `role_permissions`, so "who can delete a record" is a SQL
 * question rather than a bit test. Keys are deliberately coarser than legacy's
 * 27 — they name what this application can actually do today, nothing more.
 *
 * SERVER ONLY.
 */

export const PERMISSIONS = {
  "circulation.loan": "Prêter, rendre et prolonger au guichet",
  "circulation.override": "Passer outre un refus (quota, exemplaire exclu du prêt, limite de prolongation)",
  "holds.manage": "Gérer les réservations et les documents à ranger",
  "readers.manage": "Inscrire des lecteurs et importer une classe",
  "catalog.edit": "Créer et modifier notices et exemplaires",
  "catalog.delete": "Supprimer notices et exemplaires",
  "staff.manage": "Gérer les comptes du personnel et leurs rôles",
} as const;

export type Permission = keyof typeof PERMISSIONS;

export const PERMISSION_KEYS = Object.keys(PERMISSIONS) as Permission[];

export function isPermission(value: string): value is Permission {
  return value in PERMISSIONS;
}
