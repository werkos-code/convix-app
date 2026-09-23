"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

export function PushEnableButton() {
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (!cancelled) setSubscribed(Boolean(sub));
      } catch {
        // ignore
      }
    }
    void check();
    return () => {
      cancelled = true;
    };
  }, []);

  async function enable() {
    setPending(true);
    setStatus(null);
    try {
      if (!publicKey) {
        setStatus("Push is nog niet geconfigureerd (VAPID-sleutel ontbreekt).");
        return;
      }
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setStatus("Push wordt niet ondersteund in deze browser.");
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("Meldingstoestemming geweigerd.");
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const json = sub.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
        }),
      });

      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        setStatus(err.error ?? "Abonnement opslaan mislukt");
        return;
      }

      setSubscribed(true);
      setStatus("Meldingen ingeschakeld.");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Push inschakelen mislukt");
    } finally {
      setPending(false);
    }
  }

  async function disable() {
    setPending(true);
    setStatus(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) {
        setSubscribed(false);
        setStatus("Geen actief abonnement.");
        return;
      }

      const endpoint = sub.endpoint;
      await sub.unsubscribe();

      const res = await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint }),
      });

      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        setStatus(err.error ?? "Uitschakelen mislukt");
        return;
      }

      setSubscribed(false);
      setStatus("Meldingen uitgeschakeld.");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Uitschakelen mislukt");
    } finally {
      setPending(false);
    }
  }

  async function sendTest() {
    setPending(true);
    setStatus(null);
    try {
      const res = await fetch("/api/push/subscribe", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Convix",
          body: "Testmelding — push werkt.",
          url: "/app",
        }),
      });
      const json = (await res.json()) as {
        error?: string;
        results?: { ok: boolean }[];
      };
      if (!res.ok) {
        setStatus(json.error ?? "Testmelding mislukt");
        return;
      }
      const ok = json.results?.some((r) => r.ok);
      setStatus(ok ? "Testmelding verstuurd." : "Geen toestel bereikt.");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Testmelding mislukt");
    } finally {
      setPending(false);
    }
  }

  async function runCheck() {
    setPending(true);
    setStatus(null);
    try {
      const res = await fetch("/api/push/dispatch", { method: "POST" });
      const json = (await res.json()) as {
        error?: string;
        sent?: number;
        skipped?: number;
      };
      if (!res.ok) {
        setStatus(json.error ?? "Controle mislukt");
        return;
      }
      setStatus(
        `Controle klaar: ${json.sent ?? 0} verstuurd, ${json.skipped ?? 0} overgeslagen.`,
      );
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Controle mislukt");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        {!subscribed ? (
          <Button
            type="button"
            onClick={enable}
            disabled={pending}
            className="w-full sm:flex-1"
          >
            {pending ? "Bezig…" : "Meldingen inschakelen"}
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={disable}
            disabled={pending}
            className="w-full sm:flex-1"
          >
            {pending ? "Bezig…" : "Meldingen uitzetten"}
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          onClick={sendTest}
          disabled={pending || !subscribed}
          className="w-full sm:flex-1"
        >
          Testmelding
        </Button>
      </div>
      <Button
        type="button"
        variant="ghost"
        onClick={runCheck}
        disabled={pending || !subscribed}
        className="w-full text-sm"
      >
        Nu controleren op meldingen
      </Button>
      {status ? (
        <p className="text-sm text-slate-500">{status}</p>
      ) : null}
      <p className="text-xs text-slate-500">
        Op iPhone/iPad: installeer Convix eerst op het beginscherm (iOS 16.4+),
        schakel daarna meldingen in vanuit de geïnstalleerde app.
      </p>
    </div>
  );
}
