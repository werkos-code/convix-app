/**
 * Display helpers for calendar dates.
 * Storage stays ISO (YYYY-MM-DD); UI shows European formats.
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})/;

const MONTHS_SHORT_NL = [
  "jan",
  "feb",
  "mrt",
  "apr",
  "mei",
  "jun",
  "jul",
  "aug",
  "sep",
  "okt",
  "nov",
  "dec",
] as const;

/** Format YYYY-MM-DD (or ISO datetime) as DD-MM-YYYY. */
export function formatDateNL(value: string | null | undefined): string {
  if (!value) return "";
  const match = ISO_DATE.exec(value.trim());
  if (!match) return value;
  const [, year, month, day] = match;
  return `${day}-${month}-${year}`;
}

/**
 * Compact Dutch date for period chrome: "24 sep" (day + 3-letter month).
 */
export function formatDateShortNL(value: string | null | undefined): string {
  if (!value) return "";
  const parts = splitISODate(value);
  if (!parts) return value;
  return `${parts.day} ${parts.monthShort}`;
}

/** Day number + 3-letter Dutch month for stacked date pills. */
export function splitISODate(
  value: string | null | undefined,
): { day: number; monthShort: string; month: string; year: string } | null {
  if (!value) return null;
  const match = ISO_DATE.exec(value.trim());
  if (!match) return null;
  const [, year, month, day] = match;
  const monthIndex = Number(month) - 1;
  const monthShort = MONTHS_SHORT_NL[monthIndex];
  if (!monthShort) return null;
  return {
    day: Number(day),
    monthShort,
    month,
    year,
  };
}

/** Format a period range, e.g. "24-09-2026 → 23-10-2026". */
export function formatDateRangeNL(
  startsOn: string | null | undefined,
  endsOn: string | null | undefined,
  separator = " → ",
): string {
  const start = formatDateNL(startsOn);
  const end = formatDateNL(endsOn);
  if (start && end) return `${start}${separator}${end}`;
  return start || end;
}

/** Compact period range, e.g. "24 sep → 23 okt". */
export function formatDateRangeShortNL(
  startsOn: string | null | undefined,
  endsOn: string | null | undefined,
  separator = " → ",
): string {
  const start = formatDateShortNL(startsOn);
  const end = formatDateShortNL(endsOn);
  if (start && end) return `${start}${separator}${end}`;
  return start || end;
}

function addDaysISO(isoDate: string, days: number): string | null {
  const match = ISO_DATE.exec(isoDate.trim());
  if (!match) return null;
  const [, y, m, d] = match;
  const dt = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/**
 * Timeline / relative day label.
 * "Morgen" when `date` is the calendar day after `today`, else DD-MM-YYYY.
 */
export function formatTimelineDayLabel(
  date: string | null | undefined,
  today: string | null | undefined,
): string {
  if (!date) return "";
  const day = ISO_DATE.exec(date.trim())?.[0] ?? date.trim().slice(0, 10);
  if (today) {
    const tomorrow = addDaysISO(today, 1);
    if (tomorrow && day === tomorrow) return "Morgen";
    if (day === today.trim().slice(0, 10)) return "Vandaag";
  }
  return formatDateNL(date);
}
