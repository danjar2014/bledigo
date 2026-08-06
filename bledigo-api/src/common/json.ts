/**
 * SQLite (dev local) ne supporte pas le type Json de Prisma : les champs
 * concernes sont declares en String et stockent du JSON serialise.
 * PostgreSQL (prod) utilise le vrai type Json.
 * Ces deux helpers permettent au code metier d etre identique sur les deux.
 */
const isSqlite = (process.env.DATABASE_URL || '').startsWith('file:');

export function toDbJson(value: unknown): any {
  if (value === undefined || value === null) return isSqlite ? '{}' : {};
  return isSqlite ? JSON.stringify(value) : value;
}

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
