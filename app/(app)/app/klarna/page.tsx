import { Suspense } from "react";
import { CreditCard } from "lucide-react";

import { KlarnaForm } from "./klarna-form";
import {
  KlarnaInstallmentRow,
  type KlarnaRowItem,
} from "./klarna-installment-row";
import { KlarnaMark } from "@/components/brand/klarna-mark";
import { PanelSkeleton } from "@/components/layout/page-loading-skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth/require-user";
import { formatEuro } from "@/lib/money/cents";
import { todayInTimezone } from "@/lib/periods/salary-period";

export const metadata = {
  title: "Klarna",
};

const OPEN_STATUSES = new Set([
  "planned",
  "due",
  "partially_paid",
  "returned_open",
]);

async function KlarnaContent() {
  const { user, supabase } = await requireUser();

  const [{ data: purchaseRows }, { data: profile }] = await Promise.all([
    supabase
      .from("klarna_purchases")
      .select("id, name, total_cents, plan, status, purchased_on")
      .eq("user_id", user.id)
      .order("purchased_on", { ascending: false }),
    supabase
      .from("profiles")
      .select("timezone")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  const today = todayInTimezone(profile?.timezone ?? "Europe/Amsterdam");
  const ids = (purchaseRows ?? []).map((p) => p.id);

  const { data: installmentRows } =
    ids.length > 0
      ? await supabase
          .from("klarna_installments")
          .select(
            "id, purchase_id, sequence, due_on, amount_cents, status, obligation_id",
          )
          .eq("user_id", user.id)
          .in("purchase_id", ids)
          .order("due_on", { ascending: true })
      : {
          data: [] as Array<{
            id: string;
            purchase_id: string;
            sequence: number;
            due_on: string;
            amount_cents: number;
            status: string;
            obligation_id: string | null;
          }>,
        };

  const purchaseById = new Map((purchaseRows ?? []).map((p) => [p.id, p]));
  const countByPurchase = new Map<string, number>();
  for (const i of installmentRows ?? []) {
    countByPurchase.set(
      i.purchase_id,
      (countByPurchase.get(i.purchase_id) ?? 0) + 1,
    );
  }

  const rows: KlarnaRowItem[] = (installmentRows ?? [])
    .filter((i) => OPEN_STATUSES.has(i.status))
    .map((i) => {
      const purchase = purchaseById.get(i.purchase_id);
      return {
        installmentId: i.id,
        purchaseId: i.purchase_id,
        obligationId: i.obligation_id,
        name: purchase?.name ?? "Klarna",
        dueOn: i.due_on,
        amountCents: i.amount_cents,
        plan: purchase?.plan ?? "pay_in_30",
        sequence: i.sequence,
        installmentCount: countByPurchase.get(i.purchase_id) ?? 1,
        purchaseStatus: purchase?.status ?? "open",
      };
    })
    .sort((a, b) => (a.dueOn < b.dueOn ? -1 : a.dueOn > b.dueOn ? 1 : 0));

  const openTotal = rows.reduce((sum, r) => sum + r.amountCents, 0);

  return (
    <>
      {openTotal > 0 ? (
        <p className="glass-chip rounded-2xl px-4 py-3 text-sm text-slate-600">
          Nog te betalen{" "}
          <span className="font-semibold tabular-nums text-slate-900">
            {formatEuro(openTotal)}
          </span>
        </p>
      ) : null}

      <ul className="glass-card overflow-hidden rounded-[1.75rem]">
        {rows.length === 0 ? (
          <li className="flex flex-col items-center gap-2 px-5 py-10 text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-[#121218]">
              <KlarnaMark active className="text-base text-[#FFA8CD]" />
            </div>
            <p className="text-sm font-medium text-slate-800">
              Geen openstaande termijnen
            </p>
            <p className="text-xs text-slate-500">
              Voeg een aankoop toe om termijnen in je planning te zetten.
            </p>
          </li>
        ) : (
          rows.map((item) => (
            <KlarnaInstallmentRow
              key={item.installmentId}
              item={item}
              today={today}
            />
          ))
        )}
      </ul>

      <KlarnaForm />
    </>
  );
}

export default function KlarnaPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Klarna" icon={CreditCard} />
      <Suspense fallback={<PanelSkeleton rows={5} />}>
        <KlarnaContent />
      </Suspense>
    </div>
  );
}
