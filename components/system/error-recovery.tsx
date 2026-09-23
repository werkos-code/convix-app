"use client";

import { useRouter } from "next/navigation";
import { CircleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ErrorRecovery({
  title = "Er ging iets mis",
  message = "Probeer de pagina opnieuw te laden. Je gegevens zijn veilig.",
  reset,
}: {
  title?: string;
  message?: string;
  reset?: () => void;
}) {
  const router = useRouter();

  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
        <CircleAlert className="size-7" aria-hidden />
      </div>
      <h1 className="mt-6 text-xl font-semibold text-slate-900">{title}</h1>
      <p className="mt-2 text-sm text-slate-600">{message}</p>
      <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
        {reset ? (
          <Button type="button" onClick={reset} className="w-full sm:w-auto">
            Opnieuw proberen
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          className="w-full sm:w-auto"
          onClick={() => router.push("/app")}
        >
          Naar home
        </Button>
      </div>
    </main>
  );
}
