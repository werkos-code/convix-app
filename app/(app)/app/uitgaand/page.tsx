import { Suspense } from "react";
import { ArrowUpRight } from "lucide-react";

import { BudgetsPanel } from "@/app/(app)/app/budgets/budgets-panel";
import { DebtsPanel } from "@/app/(app)/app/debts/debts-panel";
import { FixedPanel } from "@/app/(app)/app/fixed/fixed-panel";
import { PanelSkeleton } from "@/components/layout/page-loading-skeleton";
import { UitgaandTabs } from "@/components/uitgaand/uitgaand-tabs";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { parseUitgaandTab } from "@/lib/uitgaand/tabs";

export const metadata = {
  title: "Uitgaand",
};

async function UitgaandContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const tabParam = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const nieuwParam = Array.isArray(params.nieuw)
    ? params.nieuw[0]
    : params.nieuw;
  const tab = parseUitgaandTab(tabParam);
  const expandDebtForm = nieuwParam === "1";

  return (
    <>
      <UitgaandTabs active={tab} nieuw={expandDebtForm} />

      <Suspense fallback={<PanelSkeleton />}>
        {tab === "schulden" ? <DebtsPanel expandForm={expandDebtForm} /> : null}
        {tab === "budgetten" ? <BudgetsPanel /> : null}
        {tab === "vaste-lasten" ? <FixedPanel /> : null}
      </Suspense>
    </>
  );
}

function UitgaandContentFallback() {
  return (
    <>
      <Skeleton className="h-12 w-full rounded-full bg-white/60" />
      <PanelSkeleton />
    </>
  );
}

export default function UitgaandPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Uitgaand" icon={ArrowUpRight} />

      <Suspense fallback={<UitgaandContentFallback />}>
        <UitgaandContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
