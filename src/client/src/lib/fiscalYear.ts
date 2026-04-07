/** Indian FY: 1 Apr – 31 Mar. `startYear` is the calendar year in which FY begins (e.g. 2025 → FY 2025-26). */

export function indianFyStartYearFromDate(d: Date = new Date()): number {
  const m = d.getMonth() + 1;
  const y = d.getFullYear();
  return m >= 4 ? y : y - 1;
}

export function fiscalYearLabel(startYear: number): string {
  return `${startYear}-${String(startYear + 1).slice(-2)}`;
}

export function recentIndianFyStartYears(count: number, ref: Date = new Date()): number[] {
  const cur = indianFyStartYearFromDate(ref);
  return Array.from({ length: count }, (_, i) => cur - i);
}
