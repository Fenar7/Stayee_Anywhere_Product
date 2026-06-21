/**
 * Convert Rupees to Paise (integer). All monetary values in the database
 * are stored as integers in Paise to avoid floating-point issues.
 * 1 Rupee = 100 Paise.
 */
export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

/**
 * Convert Paise (integer) to Rupees (float) for display purposes.
 */
export function paiseToRupees(paise: number): number {
  return paise / 100;
}

/**
 * Format a Paise integer as a Rupee string with Indian locale formatting.
 * e.g. 150000 → "₹ 1,500"
 */
export function formatRupees(paise: number): string {
  const rupees = paiseToRupees(paise);
  return `₹ ${rupees.toLocaleString("en-IN")}`;
}
