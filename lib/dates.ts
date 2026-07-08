const IST_TIMEZONE = "Asia/Kolkata";
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Get IST date components (year, month, day) for a given Date.
 */
export function getISTDateParts(date: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: IST_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  return {
    year: parseInt(parts.find((p) => p.type === "year")!.value),
    month: parseInt(parts.find((p) => p.type === "month")!.value),
    day: parseInt(parts.find((p) => p.type === "day")!.value),
  };
}

/**
 * Returns a Date object set to 23:59:59.999 IST for the given day.
 * Useful for "end of today" boundary checks.
 */
export function getEndOfDayIST(date: Date = new Date()): Date {
  const { year, month, day } = getISTDateParts(date);
  return new Date(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T23:59:59.999+05:30`);
}

/**
 * Returns a Date object set to 00:00:00.000 IST (midnight) for the given date.
 */
export function getStartOfDayIST(date: Date): Date {
  const { year, month, day } = getISTDateParts(date);
  return new Date(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T00:00:00.000+05:30`);
}

/**
 * Add exactly `days` number of days to a date.
 * Safe across month boundaries, leap years, and DST (though IST has no DST).
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Calculate the difference in whole days between two dates.
 * Returns a non-negative integer, floored to whole days.
 */
export function diffInDays(start: Date, end: Date): number {
  const diffMs = end.getTime() - start.getTime();
  return Math.max(0, Math.round(diffMs / MS_PER_DAY));
}

/**
 * Converts a Date to ISO midnight IST string: "YYYY-MM-DDT00:00:00.000Z"
 * This represents midnight IST in UTC-normalized ISO form, as required by the PRD.
 */
export function toISTMidnightISO(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: IST_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(date)
    .reduce(
      (acc, part) => {
        if (part.type === "year") acc.year = part.value;
        if (part.type === "month") acc.month = part.value;
        if (part.type === "day") acc.day = part.value;
        return acc;
      },
      { year: "", month: "", day: "" }
    );

  return `${parts.year}-${parts.month}-${parts.day}T00:00:00.000Z`;
}

/**
 * Check if a given checkout date is in the future relative to IST today.
 * A date is considered "in the future" if it is after 23:59:59.999 IST today.
 */
export function isFutureDateIST(checkoutDate: Date): boolean {
  const endOfDayIST = getEndOfDayIST();
  return checkoutDate.getTime() > endOfDayIST.getTime();
}

/**
 * Calculate the next due date for monthly stays by adding exactly
 * `totalMonthsPaid * 30` days to joiningDate, as mandated by the PRD.
 */
export function calculateMonthlyNextDueDate(
  joiningDate: Date,
  totalMonthsPaid: number
): Date {
  return addDays(joiningDate, totalMonthsPaid * 30);
}
