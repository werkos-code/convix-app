import { parseEuroInput } from "@/lib/money/cents";
import type { Cents } from "@/lib/money/cents";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export function ok(): ActionResult<void>;
export function ok<T>(data: T): ActionResult<T>;
export function ok<T>(data?: T): ActionResult<T | void> {
  return { ok: true, data: data as T };
}

export function fail(error: string): ActionResult<never> {
  return { ok: false, error };
}

export function requireCents(
  euroInput: string,
  label = "Bedrag",
  options: { allowNegative?: boolean } = {},
): Cents {
  const cents = parseEuroInput(euroInput);
  if (cents == null) {
    throw new Error(`${label} is ongeldig`);
  }
  if (!options.allowNegative && cents < 0) {
    throw new Error(`${label} mag niet negatief zijn`);
  }
  return cents;
}

export function formString(
  formData: FormData,
  key: string,
): string | undefined {
  const v = formData.get(key);
  if (v == null) return undefined;
  const s = String(v).trim();
  return s.length ? s : undefined;
}
