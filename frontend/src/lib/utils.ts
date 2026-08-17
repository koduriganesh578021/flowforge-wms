import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Safely format a number with specified decimal places.
 * Returns fallback string "—" if value is null, undefined, or non-finite.
 */
export function formatNumber(value: unknown, digits: number = 2): string {
  if (value === null || value === undefined) {
    return '—';
  }
  
  const num = Number(value);
  if (!isFinite(num)) {
    return '—';
  }
  
  return num.toFixed(digits);
}

/**
 * Safely convert a value to a number for calculations.
 * Returns 0 if value is null, undefined, or non-finite.
 */
export function toNumber(value: unknown): number {
  if (value === null || value === undefined) {
    return 0;
  }
  
  const num = Number(value);
  return isFinite(num) ? num : 0;
}

/** Formats a priority score for display without conflating missing data with zero. */
export function formatPriorityScore(value: unknown): string {
  if (value === null || value === undefined) {
    return 'Not calculated';
  }

  const num = Number(value);
  return Number.isFinite(num) ? `${num.toFixed(0)}/100` : 'Not calculated';
}
