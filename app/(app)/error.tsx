"use client";

import { ErrorRecovery } from "@/components/system/error-recovery";

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorRecovery
      title="Pagina kon niet laden"
      message="Er ging iets mis in de app. Probeer opnieuw of ga terug naar home."
      reset={reset}
    />
  );
}
