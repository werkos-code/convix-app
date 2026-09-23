import { parseEuroInput } from "@/lib/money/cents";
import type { Cents } from "@/lib/money/cents";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail(error: string): ActionResult<never> {
  return { ok: false, error };
}

export function requireCents(euroInput: string, label = "Amount"): Cents {
  const cents = parseEuroInput(euroInput);
  if (cents == null || cents < 0) {
    throw new Error(`${label} is invalid`);
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
