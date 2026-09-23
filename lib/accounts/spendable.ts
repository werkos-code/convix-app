import type { AccountType } from "@/lib/types/domain";

/** Accounts that feed Free Spendable cash basis (excludes dedicated savings). */
export function isSpendableAccountType(type: AccountType | string): boolean {
  return type === "checking" || type === "other";
}
