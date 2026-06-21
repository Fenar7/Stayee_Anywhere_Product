import { getISTDateParts, getStartOfDayIST, addDays } from "@/lib/dates";

const IST_TIMEZONE = "Asia/Kolkata";

/**
 * Food ordering cutoff hour in IST (24-hour format).
 * Orders for day D must be placed before 10:00 PM IST on day D-1.
 */
const CUTOFF_HOUR_IST = 22;
const CUTOFF_MINUTE_IST = 0;

/**
 * Returns the current IST time as a formatted string for logging.
 */
function formatISTTime(date: Date): string {
  return date.toLocaleString("en-IN", { timeZone: IST_TIMEZONE });
}

/**
 * Check if the current IST time is past the 10:00 PM cutoff for a given target date.
 *
 * Rule: For a target date `D`, updates must be blocked if the current time is past
 * 10:00 PM IST on day `D-1`.
 *
 * Example: Tomorrow's meals cannot be changed after 10 PM IST today.
 *
 * @param targetDate - The date for which food ordering is being checked (the "forDate")
 * @param now - Current time (defaults to `new Date()`). Injected for testability.
 * @returns `true` if the cutoff has passed (ordering blocked), `false` if still allowed.
 */
export function isPastFoodCutoff(targetDate: Date, now: Date = new Date()): boolean {
  // Get the start of the target date in IST (midnight)
  const targetStartIST = getStartOfDayIST(targetDate);

  // The cutoff applies at 10:00 PM IST on the day BEFORE the target date
  const cutoffDayIST = addDays(targetStartIST, -1);

  // Build the cutoff datetime: 10:00 PM IST on cutoffDay
  const { year, month, day } = getISTDateParts(cutoffDayIST);
  const cutoffTime = new Date(
    `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(CUTOFF_HOUR_IST).padStart(2, "0")}:${String(CUTOFF_MINUTE_IST).padStart(2, "0")}:00.000+05:30`
  );

  // Compare: if now is after the cutoff, ordering is blocked
  return now.getTime() >= cutoffTime.getTime();
}

/**
 * Get the cutoff datetime for a given target date (10:00 PM IST on D-1).
 * Useful for display purposes.
 *
 * @param targetDate - The food target date
 * @returns The cutoff Date in IST
 */
export function getCutoffTime(targetDate: Date): Date {
  const targetStartIST = getStartOfDayIST(targetDate);
  const cutoffDayIST = addDays(targetStartIST, -1);
  const { year, month, day } = getISTDateParts(cutoffDayIST);
  return new Date(
    `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(CUTOFF_HOUR_IST).padStart(2, "0")}:${String(CUTOFF_MINUTE_IST).padStart(2, "0")}:00.000+05:30`
  );
}

/**
 * Format the cutoff time as a human-readable IST string.
 *
 * @param targetDate - The food target date
 * @returns Formatted string like "10:00 PM IST on 24 Jun 2026"
 */
export function formatCutoffTime(targetDate: Date): string {
  const cutoff = getCutoffTime(targetDate);
  return cutoff.toLocaleString("en-IN", {
    timeZone: IST_TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZoneName: "short",
  });
}
