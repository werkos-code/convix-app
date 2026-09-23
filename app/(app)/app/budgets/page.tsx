import { redirect } from "next/navigation";

export default function BudgetsRedirectPage() {
  redirect("/app/uitgaand?tab=budgetten");
}
