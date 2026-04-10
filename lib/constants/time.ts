/**
 * Time-related constants for consistent calculations throughout the app.
 * Using milliseconds as the base unit.
 */

/** Milliseconds per second */
export const MS_PER_SECOND = 1000;

/** Seconds per minute */
export const SECONDS_PER_MINUTE = 60;

/** Minutes per hour */
export const MINUTES_PER_HOUR = 60;

/** Hours per day */
export const HOURS_PER_DAY = 24;

/** Milliseconds per minute */
export const MS_PER_MINUTE = MS_PER_SECOND * SECONDS_PER_MINUTE;

/** Milliseconds per hour */
export const MS_PER_HOUR = MS_PER_MINUTE * MINUTES_PER_HOUR;

/** Milliseconds per day */
export const MS_PER_DAY = MS_PER_HOUR * HOURS_PER_DAY;

/** Days per week */
export const DAYS_PER_WEEK = 7;

/** Average days per month (accounting for leap years: 365.25 / 12) */
export const DAYS_PER_MONTH = 30.4375;

/** Days per year (accounting for leap years) */
export const DAYS_PER_YEAR = 365.25;

/** Milliseconds per week */
export const MS_PER_WEEK = MS_PER_DAY * DAYS_PER_WEEK;

/** Dutch business days per year (accounting for holidays) */
export const DUTCH_BUSINESS_DAYS_PER_YEAR = 251;

/**
 * Calculate the number of days between two dates.
 * Returns positive integer, or 0 if dates are invalid.
 */
export function daysBetween(startDate: Date | string, endDate: Date | string): number {
  const start = startDate instanceof Date ? startDate : new Date(startDate);
  const end = endDate instanceof Date ? endDate : new Date(endDate);

  const startMs = start.getTime();
  const endMs = end.getTime();

  if (Number.isNaN(startMs) || Number.isNaN(endMs)) return 0;

  return Math.max(0, Math.ceil((endMs - startMs) / MS_PER_DAY));
}

/**
 * Calculate the difference in days between two dates (can be negative).
 */
export function daysDiff(startDate: Date | string, endDate: Date | string): number {
  const start = startDate instanceof Date ? startDate : new Date(startDate);
  const end = endDate instanceof Date ? endDate : new Date(endDate);

  const startMs = start.getTime();
  const endMs = end.getTime();

  if (Number.isNaN(startMs) || Number.isNaN(endMs)) return 0;

  return Math.floor((endMs - startMs) / MS_PER_DAY);
}
