"use client";

import { ErrorRecovery } from "@/components/system/error-recovery";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="nl">
      <body className="bg-[#f6f3fb] font-sans text-slate-900">
        <ErrorRecovery
          title="Convix is even offline"
          message="De app kon niet starten. Vernieuw de pagina of probeer later opnieuw."
          reset={reset}
        />
      </body>
    </html>
  );
}
