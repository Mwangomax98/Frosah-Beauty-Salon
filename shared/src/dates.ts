// All dates are "YYYY-MM-DD" strings in local (Dar es Salaam, UTC+3) wall-clock terms.
// Avoid timezone drift by doing arithmetic in UTC on the date parts only.

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(s: unknown): s is string {
  if (typeof s !== "string" || !ISO.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function toIso(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

export function parseIso(s: string): Date {
  return new Date(`${s}T00:00:00Z`);
}

export function addDays(s: string, n: number): string {
  const d = parseIso(s);
  d.setUTCDate(d.getUTCDate() + n);
  return toIso(d);
}

/** Whole days from a to b (b - a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((parseIso(b).getTime() - parseIso(a).getTime()) / 86400000);
}

/** Inclusive list of dates. */
export function eachDate(from: string, to: string): string[] {
  const out: string[] = [];
  let cur = from;
  let guard = 0;
  while (cur <= to && guard++ < 1000) {
    out.push(cur);
    cur = addDays(cur, 1);
  }
  return out;
}

export function isDateInRange(d: string, start: string, endInclusive: string): boolean {
  return d >= start && d <= endInclusive;
}

/**
 * Two half-open ranges [aStart, aEnd) and [bStart, bEnd) overlap.
 * For stays: checkOut is exclusive. For cars we treat the return date as exclusive too but
 * add one day of buffer on the server side for cleaning/turnaround.
 */
export function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function todayIso(now = new Date()): string {
  // Dar es Salaam is UTC+3 all year.
  const shifted = new Date(now.getTime() + 3 * 3600 * 1000);
  return toIso(shifted);
}
