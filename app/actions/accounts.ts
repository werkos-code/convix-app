"use server";

import { revalidatePath } from "next/cache";
import { confirmPeriodFromAccountBalances } from "@/lib/accounts/confirm-period-balances";
import { requireUser } from "@/lib/auth/require-user";
import { ensureOpenPeriod } from "@/lib/periods/ensure-open-period";
import { accountSchema } from "@/lib/validations/schemas";
import type { Account } from "@/lib/types/domain";
import { fail, ok, requireCents, type ActionResult } from "./_result";

function mapAccount(row: {
  id: string;
  user_id: string;
  name: string;
  type: "checking" | "savings" | "other";
  is_active: boolean;
  sort_order: number;
  last_confirmed_balance_cents: number;
  last_confirmed_at: string | null;
  created_at: string;
}): Account {
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    type: row.type,
    is_active: row.is_active,
    sort_order: row.sort_order,
    last_confirmed_balance_cents: row.last_confirmed_balance_cents,
    last_confirmed_at: row.last_confirmed_at,
    created_at: row.created_at,
  };
}

export async function listAccounts(): Promise<ActionResult<Account[]>> {
  try {
    const { user, supabase } = await requireUser();
    const { data, error } = await supabase
      .from("accounts")
      .select("*")
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) return fail(error.message);
    return ok((data ?? []).map(mapAccount));
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to list accounts");
  }
}

export async function createAccount(input: {
  name: string;
  type: "checking" | "savings" | "other";
  balanceEuros: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = accountSchema.safeParse(input);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid account");
    }

    const balanceCents = requireCents(parsed.data.balanceEuros, "Saldo", {
      allowNegative: true,
    });
    const { user, supabase } = await requireUser();

    const { count } = await supabase
      .from("accounts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    const { data, error } = await supabase
      .from("accounts")
      .insert({
        user_id: user.id,
        name: parsed.data.name,
        type: parsed.data.type,
        sort_order: count ?? 0,
        last_confirmed_balance_cents: balanceCents,
        last_confirmed_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) return fail(error.message);

    revalidatePath("/app");
    revalidatePath("/app/accounts");
    return ok({ id: data.id });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to create account");
  }
}

export async function updateAccount(input: {
  id: string;
  name?: string;
  type?: "checking" | "savings" | "other";
  isActive?: boolean;
  balanceEuros?: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const { user, supabase } = await requireUser();
    const patch: {
      name?: string;
      type?: "checking" | "savings" | "other";
      is_active?: boolean;
      last_confirmed_balance_cents?: number;
      last_confirmed_at?: string;
    } = {};

    if (input.name != null) patch.name = input.name.trim();
    if (input.type != null) patch.type = input.type;
    if (input.isActive != null) patch.is_active = input.isActive;
    if (input.balanceEuros != null) {
      patch.last_confirmed_balance_cents = requireCents(
        input.balanceEuros,
        "Saldo",
        { allowNegative: true },
      );
      patch.last_confirmed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("accounts")
      .update(patch)
      .eq("id", input.id)
      .eq("user_id", user.id)
      .select("id")
      .single();

    if (error) return fail(error.message);

    // Re-baseline the open period cash on the latest account balances so
    // Free Spendable uses −98,17 (etc.) instead of a stale period snapshot + old ledger.
    if (input.balanceEuros != null) {
      try {
        const { period } = await ensureOpenPeriod(supabase, user.id);
        await confirmPeriodFromAccountBalances(
          supabase,
          user.id,
          period.id,
          { zeroCarryOver: true },
        );
      } catch {
        // Account update already succeeded; period sync is best-effort.
      }
    }

    revalidatePath("/app");
    revalidatePath("/app/accounts");
    revalidatePath("/app/timeline");
    return ok({ id: data.id });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to update account");
  }
}

export async function setAccountActive(input: {
  id: string;
  isActive: boolean;
}): Promise<ActionResult<{ id: string }>> {
  return updateAccount({ id: input.id, isActive: input.isActive });
}
