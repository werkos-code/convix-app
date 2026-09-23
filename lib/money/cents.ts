/** All monetary amounts in Convix are integer EUR cents. */

export type Cents = number;

export function eurosToCents(euros: number): Cents {
  return Math.round(euros * 100);
}

export function centsToEuros(cents: Cents): number {
  return cents / 100;
}

export function parseEuroInput(value: string): Cents | null {
  const normalized = value.trim().replace(",", ".").replace(/[^\d.-]/g, "");
  if (!normalized || normalized === "-" || normalized === ".") return null;
  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  return eurosToCents(n);
}

export function formatEuro(
  cents: Cents,
  options: { sign?: boolean; locale?: string } = {},
): string {
  const { sign = false, locale = "nl-NL" } = options;
  const euros = centsToEuros(cents);
  const formatted = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
  }).format(Math.abs(euros));

  if (!sign) {
    return euros < 0 ? `−${formatted}` : formatted;
  }
  if (cents > 0) return `+${formatted}`;
  if (cents < 0) return `−${formatted}`;
  return formatted;
}

export function clampCents(cents: Cents): Cents {
  return Math.trunc(cents);
}
