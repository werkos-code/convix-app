/**
 * Display helpers for calendar dates.
 * Storage stays ISO (YYYY-MM-DD); UI shows European DD-MM-YYYY.
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})/;

/** Format YYYY-MM-DD (or ISO datetime) as DD-MM-YYYY. */
export function formatDateNL(value: string | null | undefined): string {
  if (!value) return "";
  const match = ISO_DATE.exec(value.trim());
  if (!match) return value;
  const [, year, month, day] = match;
  return `${day}-${month}-${year}`;
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
