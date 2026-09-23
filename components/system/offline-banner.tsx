"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/**
 * Shows a sticky banner when the browser is offline.
 * Mutations should still fail server-side; this is the V1 UX signal.
 */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    function sync() {
      setOffline(!navigator.onLine);
    }
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-[60] border-b border-amber-200/80 bg-amber-50/95 px-4 py-2.5 text-center text-sm font-medium text-amber-950 backdrop-blur"
    >
      <span className="inline-flex items-center justify-center gap-2">
        <WifiOff className="size-4 shrink-0" aria-hidden />
        Je bent offline — wijzigingen kunnen niet worden opgeslagen.
      </span>
    </div>
  );
}
