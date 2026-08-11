/**
 * Les champs "JSON" du modele sont declares en String dans les DEUX schemas
 * Prisma, et stockent du JSON serialise.
 *
 * Historiquement seul SQLite etait dans ce cas et ce module basculait selon
 * DATABASE_URL : serialiser en local, laisser l objet brut en production ou
 * PostgreSQL offrait un vrai type Json. Depuis que schema.postgres.prisma est
 * une copie stricte de schema.prisma, cette bascule etait devenue fausse — et
 * silencieuse en local, puisque seule la branche production etait erronee.
 * Prisma rejetait alors l ecriture : « Expected String, provided (String) »
 * pour un tableau passe a un champ texte.
 *
 * On serialise donc toujours, quel que soit le moteur.
 */

export function toDbJson(value: unknown): string {
  if (value === undefined || value === null) return '{}';
  return JSON.stringify(value);
}

/**
 * Tolerant a dessein : accepte aussi bien la chaine serialisee que la valeur
 * deja deserialisee, pour rester compatible avec d eventuelles donnees ecrites
 * avant la correction ci-dessus.
 */
export function fromDbJson<T = any>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}
