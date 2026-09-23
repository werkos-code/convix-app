import { z } from "zod";

export const euroAmountSchema = z
  .string()
  .min(1)
  .transform((v) => v.trim().replace(",", "."))
  .refine((v) => !Number.isNaN(Number(v)), "Invalid amount")
  .transform((v) => Math.round(Number(v) * 100))
  .refine((cents) => cents >= 0, "Amount must be ≥ 0");

export const quickExpenseSchema = z.object({
  amountEuros: z.string().min(1, "Voer een bedrag in"),
  name: z
    .string()
    .trim()
    .min(1, "Geef een korte omschrijving")
    .max(120, "Omschrijving is te lang"),
  categoryId: z.string().uuid().optional().nullable(),
  accountId: z.string().uuid().optional().nullable(),
  occurredOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ongeldige datum")
    .optional(),
});

export const accountSchema = z.object({
  name: z.string().trim().min(1).max(80),
  type: z.enum(["checking", "savings", "other"]),
  balanceEuros: z.string().min(1),
});

export const budgetCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Geef een naam")
    .max(80, "Naam is te lang"),
  defaultAmountEuros: z.string().min(1, "Voer een standaardbedrag in"),
});

export const fixedExpenseSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Geef een naam")
    .max(120, "Naam is te lang"),
  amountEuros: z.string().min(1, "Voer een bedrag in"),
  category: z.string().trim().max(80).optional(),
  recurrence: z.enum(["monthly", "yearly", "once"]),
  dayOfMonth: z.coerce
    .number({ error: "Kies een dag (1–28)" })
    .int()
    .min(1, "Dag moet tussen 1 en 28 liggen")
    .max(28, "Dag moet tussen 1 en 28 liggen"),
  monthOfYear: z.coerce
    .number()
    .int()
    .min(1)
    .max(12)
    .optional()
    .nullable(),
  accountId: z.string().uuid().optional().nullable(),
});

export const incomeRuleSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Geef een naam")
    .max(120, "Naam is te lang"),
  amountEuros: z.string().min(1, "Voer een bedrag in"),
  recurrence: z.enum(["monthly", "yearly", "once"]),
  dayOfMonth: z.coerce
    .number({ error: "Kies een dag (1–28)" })
    .int()
    .min(1, "Dag moet tussen 1 en 28 liggen")
    .max(28, "Dag moet tussen 1 en 28 liggen"),
  monthOfYear: z.coerce
    .number()
    .int()
    .min(1)
    .max(12)
    .optional()
    .nullable(),
  accountId: z.string().uuid().optional().nullable(),
});

export const klarnaPurchaseSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Geef een naam")
    .max(120, "Naam is te lang"),
  amountEuros: z.string().min(1, "Voer een bedrag in"),
  purchasedOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ongeldige aankoopdatum"),
  plan: z.enum(["pay_in_30", "pay_in_3"], {
    error: "Kies een Klarna-plan",
  }),
});

export const savingsGoalSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Geef een naam")
    .max(80, "Naam is te lang"),
  currentAmountEuros: z.string().optional(),
  targetAmountEuros: z.string().optional().nullable(),
  scheduledAmountEuros: z
    .string()
    .min(1, "Voer een maandelijkse bijdrage in"),
  contributionDay: z.coerce
    .number({ error: "Kies een dag (1–28)" })
    .int()
    .min(1, "Dag moet tussen 1 en 28 liggen")
    .max(28, "Dag moet tussen 1 en 28 liggen"),
});

export const debtSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Geef een naam")
    .max(80, "Naam is te lang"),
  outstandingEuros: z.string().min(1, "Voer het openstaande bedrag in"),
  paymentEuros: z.string().min(1, "Voer een betalingsbedrag in"),
  paymentDay: z.coerce
    .number({ error: "Kies een dag (1–28)" })
    .int()
    .min(1, "Dag moet tussen 1 en 28 liggen")
    .max(28, "Dag moet tussen 1 en 28 liggen"),
});

export const confirmBalanceSchema = z.object({
  periodId: z.string().uuid(),
  balances: z.array(
    z.object({
      accountId: z.string().uuid(),
      actualEuros: z.string().min(1),
    }),
  ),
});

export const refundSchema = z.object({
  obligationId: z.string().uuid(),
  amountEuros: z.string().min(1),
  name: z.string().trim().min(1).max(120).optional(),
  occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const settleObligationSchema = z.object({
  obligationId: z.string().uuid(),
  amountEuros: z.string().optional(),
  occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
