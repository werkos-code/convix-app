import Image from "next/image";

import { cn } from "@/lib/utils";

/** Gradient mark matching the Convix logo bars (works on light backgrounds). */
export function ConvixMark({
  className,
  title = "Convix",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={cn("shrink-0", className)}
      role="img"
      aria-label={title}
    >
      <defs>
        <linearGradient id="convixBar1" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
        <linearGradient id="convixBar2" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
        <linearGradient id="convixBar3" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="55%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      <rect x="4" y="22" width="10" height="22" rx="5" fill="url(#convixBar1)" />
      <rect x="19" y="12" width="10" height="32" rx="5" fill="url(#convixBar2)" />
      <rect x="34" y="4" width="10" height="40" rx="5" fill="url(#convixBar3)" />
    </svg>
  );
}

export function ConvixWordmark({
  className,
  markClassName,
}: {
  className?: string;
  markClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <ConvixMark className={cn("size-9", markClassName)} />
      <span className="text-xl font-semibold tracking-tight text-slate-900">
        Convix
      </span>
    </span>
  );
}

/** Full logo asset (dark plate) — use on dark hero bands. */
export function ConvixLogoImage({
  className,
  priority,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/brand/convix-logo.png"
      alt="Convix"
      width={480}
      height={160}
      priority={priority}
      className={cn("h-auto w-full max-w-xs object-contain", className)}
    />
  );
}
