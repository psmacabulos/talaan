/**
 * A small, hand-picked pool of common Filipino first and last names, used to
 * generate seed students/guardians/staff deterministically (same input index
 * always produces the same name — no randomness, no new dependency, and the
 * data looks the same on every machine and every test run).
 */

export const FIRST_NAMES = [
  "Juan", "Maria", "Jose", "Ana", "Pedro", "Carmen", "Antonio", "Rosa",
  "Miguel", "Teresa", "Francisco", "Elena", "Ramon", "Luz", "Ricardo", "Grace",
  "Eduardo", "Josephine", "Manuel", "Corazon", "Roberto", "Angelica", "Danilo", "Fe",
  "Arnel", "Precious", "Rodel", "Marites", "Bayani", "Divine", "Cristina", "Noel",
  "Jasmine", "Reynaldo", "Angelica", "Mark", "Katrina", "Paolo", "Bea", "Christian",
] as const;

export const LAST_NAMES = [
  "Dela Cruz", "Santos", "Reyes", "Cruz", "Bautista", "Ocampo", "Garcia", "Mendoza",
  "Torres", "Flores", "Ramos", "Villanueva", "Castillo", "Aquino", "Del Rosario", "Aguilar",
  "Domingo", "Pascual", "Rivera", "Gonzales", "Fernandez", "Marasigan", "Navarro", "Salvador",
  "Manalo", "Espiritu", "Lazaro", "Batumbakal", "Panganiban", "Ignacio", "Corpuz", "Bernardo",
  "Villareal", "Custodio", "Abad", "Tiongson", "Valdez", "Roque", "Sison", "Macapagal",
] as const;

/** Deterministic but not obviously repetitive: scrambles the pairing between first/last names. */
export function nameAt(index: number): { firstName: string; lastName: string } {
  const firstName = FIRST_NAMES[index % FIRST_NAMES.length];
  const lastName = LAST_NAMES[(index * 7 + 3) % LAST_NAMES.length];
  return { firstName, lastName };
}
