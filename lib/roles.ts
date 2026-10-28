import type { Permission } from "./permissions";

/**
 * The roles a school library actually staffs, and what each may do.
 *
 * Legacy shipped no roles at all — every account carried its own `rights`
 * bitmask, edited by hand per user in `admin/users`. Naming the three real
 * jobs instead means adding a colleague is picking a role, not reasoning
 * about bits.
 *
 * "Aide-documentaliste" is legacy's RESTRICTCIRC_AUTH: `circ.php` blanked
 * `$categ` unless it was `pret` or `retour`, confining that user to the desk.
 */
export const ROLE_DEFINITIONS: {
  name: string;
  description: string;
  permissions: Permission[];
}[] = [
  {
    name: "Administrateur",
    description: "Accès complet, y compris la gestion des comptes du personnel.",
    permissions: [
      "circulation.loan",
      "circulation.override",
      "holds.manage",
      "readers.manage",
      "catalog.edit",
      "catalog.delete",
      "staff.manage",
    ],
  },
  {
    name: "Bibliothécaire",
    description: "Circulation, réservations, lecteurs et catalogage.",
    permissions: [
      "circulation.loan",
      "circulation.override",
      "holds.manage",
      "readers.manage",
      "catalog.edit",
      "catalog.delete",
    ],
  },
  {
    name: "Aide-documentaliste",
    description:
      "Guichet uniquement : prêts, retours et réservations. Ni suppression ni dérogation.",
    permissions: ["circulation.loan", "holds.manage"],
  },
];
