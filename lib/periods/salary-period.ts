import { addMonths, format, isWithinInterval, subDays } from "date-fns";

export const DEFAULT_SALARY_DAY = 24;
export const DEFAULT_TIMEZONE = "Europe/Amsterdam";

/** Calendar date string YYYY-MM-DD */
export type ISODate = string;

export interface PeriodBounds {
  startsOn: ISODate;
  endsOn: ISODate;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Parse YYYY-MM-DD as a UTC calendar date (no timezone shift). */
export function parseISODate(iso: ISODate): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function toISODate(d: Date): ISODate {
  return format(d, "yyyy-MM-dd");
}

/** Today in the given IANA timezone as YYYY-MM-DD */
export function todayInTimezone(timezone: string = DEFAULT_TIMEZONE): ISODate {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  // en-CA yields YYYY-MM-DD
  return fmt.format(new Date());
}

/**
 * Salary period containing `onDate` for a given salary day (default 24).
 * Period is [salary_day, next_month(salary_day) - 1] inclusive.
 */
export function getPeriodBounds(
  onDate: ISODate,
  salaryDay: number = DEFAULT_SALARY_DAY,
): PeriodBounds {
  const d = parseISODate(onDate);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const day = d.getUTCDate();

  let startYear = y;
  let startMonth = m;

  if (day < salaryDay) {
    startMonth = m - 1;
    if (startMonth < 0) {
      startMonth = 11;
      startYear -= 1;
    }
  }

  const startsOn = `${startYear}-${pad(startMonth + 1)}-${pad(salaryDay)}`;
  const startDate = parseISODate(startsOn);
  const nextStart = addMonths(startDate, 1);
  const endsOn = toISODate(subDays(nextStart, 1));

  return { startsOn, endsOn };
}

export function daysUntil(target: ISODate, from: ISODate): number {
  const a = parseISODate(from).getTime();
  const b = parseISODate(target).getTime();
  return Math.max(0, Math.round((b - a) / (24 * 60 * 60 * 1000)));
}

export function nextSalaryDate(
  onDate: ISODate,
  salaryDay: number = DEFAULT_SALARY_DAY,
): ISODate {
  const nextStart = addMonths(
    parseISODate(getPeriodBounds(onDate, salaryDay).startsOn),
    1,
  );
  return toISODate(nextStart);
}

export function isDateInPeriod(date: ISODate, period: PeriodBounds): boolean {
  return isWithinInterval(parseISODate(date), {
    start: parseISODate(period.startsOn),
    end: parseISODate(period.endsOn),
  });
}

export function clampDayOfMonth(
  year: number,
  monthIndex: number,
  day: number,
): ISODate {
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const d = Math.min(Math.max(1, day), lastDay);
  return `${year}-${pad(monthIndex + 1)}-${pad(d)}`;
}

export function addMonthsISO(iso: ISODate, months: number): ISODate {
  return toISODate(addMonths(parseISODate(iso), months));
}

export function addDaysISO(iso: ISODate, days: number): ISODate {
  const d = parseISODate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return toISODate(d);
}
