import {
  ChartLine,
  Landmark,
  LogOut,
  MoreHorizontal,
  PiggyBank,
  Settings,
  Wallet,
} from "lucide-react";

import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { ListRow } from "@/components/ui/list-row";
import { PageHeader } from "@/components/ui/page-header";

export const metadata = {
  title: "Meer",
};

const links = [
  { href: "/app/accounts", label: "Rekeningen", icon: Landmark },
  { href: "/app/savings", label: "Spaardoelen", icon: PiggyBank },
  { href: "/app/income", label: "Inkomsten", icon: Wallet },
  { href: "/app/insights", label: "Inzichten", icon: ChartLine },
  { href: "/app/settings", label: "Instellingen", icon: Settings },
] as const;

async function signOutAction() {
  "use server";
  await signOut();
}

export default function MorePage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Meer" icon={MoreHorizontal} />

      <nav className="glass-card overflow-hidden rounded-[1.75rem]">
        <ul className="divide-y divide-slate-100/80">
          {links.map(({ href, label, icon }) => (
            <li key={href}>
              <ListRow href={href} title={label} icon={icon} />
            </li>
          ))}
        </ul>
      </nav>

      <form action={signOutAction}>
        <Button type="submit" variant="outline" className="w-full">
          <LogOut className="size-5" aria-hidden />
          Uitloggen
        </Button>
      </form>
    </div>
  );
}
