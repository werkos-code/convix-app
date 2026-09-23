import { Receipt } from "lucide-react";

import { ExpenseForm } from "./expense-form";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth/require-user";

export const metadata = {
  title: "Snelle uitgave",
};

export default async function NewExpensePage() {
  let categories: { id: string; name: string }[] = [];

  try {
    const { user, supabase } = await requireUser();
    const { data } = await supabase
      .from("budget_categories")
      .select("id, name")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    categories = data ?? [];
  } catch {
    // Demo: empty categories.
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Snelle uitgave"
        description="Log een uitgave met je duim — bedrag eerst."
        icon={Receipt}
      />
      <ExpenseForm categories={categories} />
    </div>
  );
}
