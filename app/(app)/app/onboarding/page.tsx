import { Rocket } from "lucide-react";
import { redirect } from "next/navigation";

import { OnboardingForm } from "./onboarding-form";
import { ConvixWordmark } from "@/components/brand/logo";
import { PageHeader } from "@/components/ui/page-header";
import { isNextControlFlowError } from "@/lib/auth/control-flow";
import { requireUser } from "@/lib/auth/require-user";

export const metadata = {
  title: "Welkom",
};

export default async function OnboardingPage() {
  const { user, supabase } = await requireUser();

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed_at")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.onboarding_completed_at) {
      redirect("/app");
    }
  } catch (e) {
    if (isNextControlFlowError(e)) throw e;
    // Profile missing — show onboarding form.
  }

  return (
    <div className="flex flex-col gap-6">
      <ConvixWordmark />
      <PageHeader title="Richt je cockpit in" icon={Rocket} />
      <OnboardingForm />
    </div>
  );
}
