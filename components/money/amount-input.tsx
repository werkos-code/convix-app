"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export interface AmountInputProps {
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
  className?: string;
  id?: string;
  "aria-label"?: string;
}

/** Large euro amount field optimized for one-handed mobile entry. */
export function AmountInput({
  value,
  onChange,
  autoFocus = false,
  className,
  id,
  "aria-label": ariaLabel = "Bedrag in euro",
}: AmountInputProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const next = event.target.value.replace(/[^\d.,]/g, "");
    onChange(next);
  }

  return (
    <div className={cn("relative w-full", className)}>
      <span
        className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-4xl font-semibold text-stone-400"
        aria-hidden
      >
        €
      </span>
      <input
        ref={inputRef}
        id={id}
        type="text"
        inputMode="decimal"
        enterKeyHint="done"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        value={value}
        onChange={handleChange}
        placeholder="0,00"
        aria-label={ariaLabel}
        className={cn(
          "w-full min-h-16 border-0 bg-transparent py-4 pl-10 pr-2 text-5xl font-semibold tabular-nums tracking-tight text-stone-900 outline-none placeholder:text-stone-300 focus-visible:ring-0",
        )}
      />
    </div>
  );
}
