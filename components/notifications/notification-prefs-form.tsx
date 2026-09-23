"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  preferenceLabels,
  type NotificationPreferences,
  type PushPrefKey,
} from "@/lib/push/evaluate";

const KEYS = Object.keys(preferenceLabels()) as PushPrefKey[];

export function NotificationPrefsForm({
  initial,
  action,
}: {
  initial: NotificationPreferences;
  action: (prefs: NotificationPreferences) => Promise<{ error?: string }>;
}) {
  const [prefs, setPrefs] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const labels = preferenceLabels();

  function toggle(key: PushPrefKey) {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function save() {
    setMessage(null);
    startTransition(async () => {
      const result = await action(prefs);
      setMessage(result.error ? result.error : "Voorkeuren opgeslagen.");
    });
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {KEYS.map((key) => (
          <li key={key}>
            <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-800">
              <input
                type="checkbox"
                className="mt-0.5 size-4 accent-[var(--accent)]"
                checked={prefs[key]}
                onChange={() => toggle(key)}
                disabled={pending}
              />
              <span>{labels[key]}</span>
            </label>
          </li>
        ))}
      </ul>
      <Button
        type="button"
        onClick={save}
        disabled={pending}
        className="w-full"
        size="sm"
      >
        {pending ? "Opslaan…" : "Voorkeuren opslaan"}
      </Button>
      {message ? <p className="text-sm text-slate-500">{message}</p> : null}
    </div>
  );
}
