"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/require-user";
import { ensureOpenPeriod } from "@/lib/periods/ensure-open-period";
import { budgetCategorySchema } from "@/lib/validations/schemas";
import { fail, ok, requireCents, type ActionResult } from "./_result";

export async function createBudgetCategory(input: {
  name: string;
  defaultAmountEuros: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = budgetCategorySchema.safeParse(input);
    if (!parsed.success) {
      return fail(
        parsed.error.issues[0]?.message ?? "Ongeldige budgetcategorie",
      );
    }

    let defaultCents: number;
    try {
      defaultCents = requireCents(
        parsed.data.defaultAmountEuros,
        "Standaardbedrag",
      );
    } catch {
      return fail("Voer een geldig bedrag in");
    }

    if (defaultCents < 0) {
      return fail("Bedrag mag niet negatief zijn");
    }

    const { user, supabase } = await requireUser();

    const { count } = await supabase
      .from("budget_categories")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    const { data, error } = await supabase
      .from("budget_categories")
      .insert({
        user_id: user.id,
        name: parsed.data.name,
        default_amount_cents: defaultCents,
        sort_order: count ?? 0,
      })
      .select("id")
      .single();

    if (error) return fail(error.message);

    const { period } = await ensureOpenPeriod(supabase, user.id);
    await supabase.from("period_budgets").upsert(
      {
        period_id: period.id,
        category_id: data.id,
        user_id: user.id,
        allocated_cents: defaultCents,
      },
      { onConflict: "period_id,category_id" },
    );

    revalidatePath("/app");
    revalidatePath("/app/uitgaand");
    revalidatePath("/app/budgets");
    revalidatePath("/app/expenses/new");
    return ok({ id: data.id });
  } catch (e) {
    return fail(
      e instanceof Error ? e.message : "Budgetcategorie opslaan mislukt",
    );
  }
}

export async function updateBudgetCategory(input: {
  id: string;
  name?: string;
  defaultAmountEuros?: string;
  isActive?: boolean;
  allocatedEuros?: string;
  periodId?: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    if (!input.id) return fail("Categorie niet gevonden");

    const { user, supabase } = await requireUser();
    const patch: {
      name?: string;
      default_amount_cents?: number;
      is_active?: boolean;
    } = {};

    if (input.name != null) {
      const name = input.name.trim();
      if (!name) return fail("Geef een naam");
      patch.name = name;
    }
    if (input.defaultAmountEuros != null) {
      try {
        patch.default_amount_cents = requireCents(
          input.defaultAmountEuros,
          "Standaardbedrag",
        );
      } catch {
        return fail("Voer een geldig standaardbedrag in");
      }
    }
    if (input.isActive != null) patch.is_active = input.isActive;

    if (Object.keys(patch).length > 0) {
      const { error } = await supabase
        .from("budget_categories")
        .update(patch)
        .eq("id", input.id)
        .eq("user_id", user.id);
      if (error) return fail(error.message);
    }

    if (input.isActive === false) {
      const { period } = await ensureOpenPeriod(supabase, user.id);
      await supabase
        .from("period_budgets")
        .update({ allocated_cents: 0 })
        .eq("period_id", period.id)
        .eq("category_id", input.id)
        .eq("user_id", user.id);
    }

    if (input.allocatedEuros != null) {
      let allocated: number;
      try {
        allocated = requireCents(input.allocatedEuros, "Budget deze periode");
      } catch {
        return fail("Voer een geldig budgetbedrag in");
      }

      const { period } = await ensureOpenPeriod(supabase, user.id);
      const periodId = input.periodId ?? period.id;

      const { data: existing } = await supabase
        .from("period_budgets")
        .select("id")
        .eq("period_id", periodId)
        .eq("category_id", input.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("period_budgets")
          .update({ allocated_cents: allocated })
          .eq("id", existing.id);
        if (error) return fail(error.message);
      } else {
        const { error } = await supabase.from("period_budgets").insert({
          period_id: periodId,
          category_id: input.id,
          user_id: user.id,
          allocated_cents: allocated,
        });
        if (error) return fail(error.message);
      }
    }

    revalidatePath("/app");
    revalidatePath("/app/uitgaand");
    revalidatePath("/app/budgets");
    revalidatePath("/app/expenses/new");
    return ok({ id: input.id });
  } catch (e) {
    return fail(
      e instanceof Error ? e.message : "Budget bijwerken mislukt",
    );
  }
}
