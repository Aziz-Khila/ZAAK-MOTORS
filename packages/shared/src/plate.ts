/**
 * Normalise une immatriculation pour la recherche : majuscules, sans espaces ni séparateurs.
 * "123 TU 4567", "123-tu-4567" et "123 تونس 4567" donnent tous "123TU4567".
 */
export function normalizePlate(plate: string): string {
  return plate
    .replace(/تونس/g, "TU")
    .toUpperCase()
    .replace(/[^\p{L}\p{N}]/gu, "");
}

/** Mise en forme d'affichage d'une plaque tunisienne classique : "123 TU 4567". */
export function formatPlate(plate: string): string {
  const norm = normalizePlate(plate);
  const m = norm.match(/^(\d{1,3})(TU|RS)(\d{1,4})$/);
  if (m) return `${m[1]} ${m[2]} ${m[3]}`;
  return plate.trim().toUpperCase();
}

/** Ne garde que les chiffres (recherche par téléphone). */
export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}
