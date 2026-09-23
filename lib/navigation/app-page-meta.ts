import type { LucideIcon } from "lucide-react";
import {
  ArrowUpRight,
  Building2,
  ChartLine,
  CreditCard,
  Landmark,
  LayoutList,
  MoreHorizontal,
  PiggyBank,
  Receipt,
  Settings,
  Wallet,
} from "lucide-react";

export type AppPageVariant = "home" | "list" | "form";

export type AppPageMeta = {
  title: string;
  icon: LucideIcon;
  variant: AppPageVariant;
};

const EXACT: Record<string, AppPageMeta> = {
  "/app": { title: "Home", icon: Wallet, variant: "home" },
  "/app/timeline": { title: "Tijdlijn", icon: LayoutList, variant: "list" },
  "/app/uitgaand": { title: "Uitgaand", icon: ArrowUpRight, variant: "list" },
  "/app/klarna": { title: "Klarna", icon: CreditCard, variant: "list" },
  "/app/more": { title: "Meer", icon: MoreHorizontal, variant: "list" },
  "/app/accounts": { title: "Rekeningen", icon: Landmark, variant: "list" },
  "/app/savings": { title: "Spaardoelen", icon: PiggyBank, variant: "list" },
  "/app/income": { title: "Inkomsten", icon: Wallet, variant: "list" },
  "/app/insights": { title: "Inzichten", icon: ChartLine, variant: "list" },
  "/app/settings": { title: "Instellingen", icon: Settings, variant: "form" },
  "/app/expenses/new": { title: "Uitgave", icon: Receipt, variant: "form" },
  "/app/balances/confirm": {
    title: "Saldo bevestigen",
    icon: Wallet,
    variant: "form",
  },
  "/app/debts": { title: "Schulden", icon: ArrowUpRight, variant: "list" },
  "/app/budgets": { title: "Budgetten", icon: ArrowUpRight, variant: "list" },
  "/app/fixed": { title: "Vaste lasten", icon: Building2, variant: "list" },
  "/app/onboarding": { title: "Welkom", icon: Wallet, variant: "form" },
};

const PREFIX: Array<{ prefix: string; meta: AppPageMeta }> = [
  {
    prefix: "/app/debts",
    meta: { title: "Schulden", icon: ArrowUpRight, variant: "list" },
  },
  {
    prefix: "/app/budgets",
    meta: { title: "Budgetten", icon: ArrowUpRight, variant: "list" },
  },
  {
    prefix: "/app/fixed",
    meta: { title: "Vaste lasten", icon: Building2, variant: "list" },
  },
  {
    prefix: "/app/accounts",
    meta: { title: "Rekeningen", icon: Landmark, variant: "list" },
  },
  {
    prefix: "/app/savings",
    meta: { title: "Spaardoelen", icon: PiggyBank, variant: "list" },
  },
];

/** Static titles for instant loading shells (no data fetch). */
export function resolveAppPageMeta(pathname: string): AppPageMeta | null {
  const path = pathname.replace(/\/$/, "") || "/";
  if (EXACT[path]) return EXACT[path];
  for (const entry of PREFIX) {
    if (path === entry.prefix || path.startsWith(`${entry.prefix}/`)) {
      return entry.meta;
    }
  }
  if (path.startsWith("/app")) {
    return { title: "Convix", icon: Wallet, variant: "list" };
  }
  return null;
}
