"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deactivateFixedExpenseRule } from "@/app/actions/fixed";
import { Button } from "@/components/ui/button";

export function FixedRuleActions({ id }: { id: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onDeactivate() {
    setError(null);
    startTransition(async () => {
      const result = await deactivateFixedExpenseRule({ id });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={onDeactivate}
      >
        {pending ? "…" : "Verwijderen"}
      </Button>
      {error && (
        <p className="max-w-[10rem] text-right text-[11px] text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
