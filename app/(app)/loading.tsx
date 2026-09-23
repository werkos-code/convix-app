export default function AppLoading() {
  return (
    <div className="flex flex-col gap-5 pt-2" aria-busy="true" aria-live="polite">
      <div className="h-8 w-36 animate-pulse rounded-full bg-white/70" />
      <div className="mx-auto h-10 w-56 animate-pulse rounded-full bg-white/60" />
      <div className="h-40 animate-pulse rounded-[1.75rem] bg-white/70" />
      <div className="flex gap-2.5">
        <div className="h-24 flex-1 animate-pulse rounded-3xl bg-white/60" />
        <div className="h-24 flex-1 animate-pulse rounded-3xl bg-white/60" />
        <div className="h-24 flex-1 animate-pulse rounded-3xl bg-white/60" />
      </div>
      <div className="h-48 animate-pulse rounded-[1.75rem] bg-white/70" />
      <span className="sr-only">Laden…</span>
    </div>
  );
}
