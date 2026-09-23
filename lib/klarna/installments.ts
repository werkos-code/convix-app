import type { Cents } from "@/lib/money/cents";
import {
  addDaysISO,
  addMonthsISO,
  clampDayOfMonth,
  type ISODate,
} from "@/lib/periods/salary-period";
import type { KlarnaPlan } from "@/lib/types/domain";

export interface KlarnaInstallmentPlan {
  sequence: number;
  dueOn: ISODate;
  amountCents: Cents;
  /** Immediate cash impact (pay-in-3 first installment) */
  isImmediate: boolean;
}

/**
 * Build Klarna installment schedule.
 * - pay_in_30: one installment due purchasedOn + 30 days
 * - pay_in_3: equal thirds; seq1 due purchase day, seq2 +1 month, seq3 +2 months
 */
export function buildKlarnaInstallments(
  totalCents: Cents,
  purchasedOn: ISODate,
  plan: KlarnaPlan,
): KlarnaInstallmentPlan[] {
  if (plan === "pay_in_30") {
    return [
      {
        sequence: 1,
        dueOn: addDaysISO(purchasedOn, 30),
        amountCents: totalCents,
        isImmediate: false,
      },
    ];
  }

  if (plan === "pay_in_3") {
    const base = Math.floor(totalCents / 3);
    const remainder = totalCents - base * 3;
    const amounts = [base + remainder, base, base];

    const d0 = purchasedOn;
    const [y1, m1] = addMonthsISO(purchasedOn, 1).split("-").map(Number);
    const [y2, m2] = addMonthsISO(purchasedOn, 2).split("-").map(Number);
    const day = Number(purchasedOn.split("-")[2]);

    return [
      {
        sequence: 1,
        dueOn: d0,
        amountCents: amounts[0],
        isImmediate: true,
      },
      {
        sequence: 2,
        dueOn: clampDayOfMonth(y1, m1 - 1, day),
        amountCents: amounts[1],
        isImmediate: false,
      },
      {
        sequence: 3,
        dueOn: clampDayOfMonth(y2, m2 - 1, day),
        amountCents: amounts[2],
        isImmediate: false,
      },
    ];
  }

  // custom: caller supplies installments elsewhere
  return [];
}
