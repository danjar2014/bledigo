import { UserRole } from './enums';

/**
 * Un compte porte un role principal (`role`) et des roles supplementaires
 * (`secondaryRoles`). Un proprietaire qui veut aussi reserver n a pas besoin
 * d un second compte : on lui ajoute simplement le role voyageur.
 *
 * Stockage : JSON serialise sous sqlite, tableau natif sous postgres.
 */

export function parseRoles(value: unknown): string[] {
  if (Array.isArray(value)) return value as string[];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

/** Role principal + roles supplementaires, sans doublon. */
export function effectiveRoles(user: { role?: string; secondaryRoles?: unknown } | null): string[] {
  if (!user?.role) return [];
  return [...new Set([user.role, ...parseRoles(user.secondaryRoles)])];
}

export function hasRole(user: { role?: string; secondaryRoles?: unknown } | null, role: string) {
  return effectiveRoles(user).includes(role);
}

export function hasAnyRole(
  user: { role?: string; secondaryRoles?: unknown } | null,
  roles: string[],
) {
  if (roles.length === 0) return true;
  const owned = effectiveRoles(user);
  return roles.some((r) => owned.includes(r));
}

/**
 * Roles qu un utilisateur peut s attribuer lui-meme, sans validation admin.
 *
 * `provider` en est volontairement absent : un compte prestataire n existe
 * qu apres constatation du statut d agence par l administration. C est la seule
 * verification disponible tant que l abonnement et le controle automatique ne
 * sont pas en place.
 */
export const SELF_ASSIGNABLE_ROLES: string[] = [UserRole.traveler, UserRole.owner];

/** Modes d interface exposes au front. */
export function availableModes(user: { role?: string; secondaryRoles?: unknown } | null): string[] {
  const roles = effectiveRoles(user);
  return roles.filter(
    (r) =>
      r === UserRole.traveler ||
      r === UserRole.owner ||
      r === UserRole.agency ||
      r === UserRole.provider,
  );
}
