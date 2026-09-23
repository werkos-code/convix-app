import { CreditCard } from "lucide-react";

import { KlarnaForm } from "./klarna-form";
import {
  KlarnaPurchaseCard,
  type KlarnaPurchaseView,
} from "./klarna-purchase-card";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth/require-user";
import { formatEuro } from "@/lib/money/cents";

export const metadata = {
  title: "Klarna",
};

export default async function KlarnaPage() {
  let purchases: KlarnaPurchaseView[] = [];
  let openTotal = 0;

  try {
    const { user, supabase } = await requireUser();
    const { data: purchaseRows } = await supabase
      .from("klarna_purchases")
      .select("id, name, total_cents, plan, status, purchased_on")
      .eq("user_id", user.id)
      .order("purchased_on", { ascending: false });

    const ids = (purchaseRows ?? []).map((p) => p.id);
    const { data: installmentRows } =
      ids.length > 0
        ? await supabase
            .from("klarna_installments")
            .select("id, purchase_id, sequence, due_on, amount_cents, status")
            .eq("user_id", user.id)
            .in("purchase_id", ids)
            .order("sequence", { ascending: true })
        : { data: [] as Array<{
            id: string;
            purchase_id: string;
            sequence: number;
            due_on: string;
            amount_cents: number;
            status: string;
          }> };

    const byPurchase = new Map<string, KlarnaPurchaseView["installments"]>();
    for (const i of installmentRows ?? []) {
      const list = byPurchase.get(i.purchase_id) ?? [];
      list.push({
        id: i.id,
        sequence: i.sequence,
        due_on: i.due_on,
        amount_cents: i.amount_cents,
        status: i.status,
      });
      byPurchase.set(i.purchase_id, list);
    }

    purchases = (purchaseRows ?? []).map((p) => ({
      ...p,
      installments: byPurchase.get(p.id) ?? [],
    }));

    openTotal = purchases
      .filter((p) => p.status === "open")
      .flatMap((p) => p.installments)
      .filter((i) =>
        ["planned", "due", "partially_paid", "returned_open"].includes(
          i.status,
        ),
      )
      .reduce((sum, i) => sum + i.amount_cents, 0);
  } catch {
    // empty
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Klarna"
        description="Betaal in 30 of in 3 — termijnen reserveren Free Spendable"
        icon={CreditCard}
      />

      {openTotal > 0 && (
        <p className="glass-chip rounded-2xl px-4 py-3 text-sm text-slate-600">
          Nog openstaand:{" "}
          <span className="font-semibold tabular-nums text-slate-900">
            {formatEuro(openTotal)}
          </span>
        </p>
      )}

      <ul className="glass-card overflow-hidden rounded-[1.75rem]">
        {purchases.length === 0 ? (
          <li className="px-5 py-6 text-sm text-slate-500">
            Geen Klarna-aankopen. Voeg er een toe om termijnen in je planning te
            zetten.
          </li>
        ) : (
          purchases.map((p) => (
            <KlarnaPurchaseCard key={p.id} purchase={p} />
          ))
        )}
      </ul>

      <KlarnaForm />
    </div>
  );
}
