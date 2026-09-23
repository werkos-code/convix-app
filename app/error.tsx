"use client";

import { ErrorRecovery } from "@/components/system/error-recovery";

export default function RootError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorRecovery
      title="Er ging iets mis"
      message="Probeer de pagina opnieuw te laden."
      reset={reset}
    />
  );
}
