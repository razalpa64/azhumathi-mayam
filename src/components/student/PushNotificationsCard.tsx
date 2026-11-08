'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bell, BellOff, BellRing, Loader2 } from 'lucide-react';

type Status =
  | 'checking'
  | 'unconfigured'
  | 'unsupported'
  | 'denied'
  | 'on'
  | 'off'
  | 'busy';

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Settings card: opt this device into web push. When new study
 * material is published for the student's course audience, the server
 * pushes "New study material…" alongside the in-app notification.
 */
export function PushNotificationsCard() {
  const [status, setStatus] = useState<Status>('checking');
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/student/push');
      const data = await res.json().catch(() => ({}));
      if (!data.enabled || !data.publicKey) {
        setStatus('unconfigured');
        return;
      }
      setPublicKey(data.publicKey as string);

      if (
        !('serviceWorker' in navigator) ||
        !('PushManager' in window) ||
        !('Notification' in window)
      ) {
        setStatus('unsupported');
        return;
      }
      if (Notification.permission === 'denied') {
        setStatus('denied');
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setStatus(subscription ? 'on' : 'off');
    } catch {
      setStatus('unsupported');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const enable = async () => {
    if (!publicKey) return;
    setError(null);
    setStatus('busy');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus(permission === 'denied' ? 'denied' : 'off');
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const res = await fetch('/api/student/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'subscribe',
          subscription: subscription.toJSON(),
          userAgent: navigator.userAgent,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Could not switch notifications on.');
      }
      setStatus('on');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not switch notifications on.'
      );
      setStatus('off');
    }
  };

  const disable = async () => {
    setError(null);
    setStatus('busy');
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch('/api/student/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'unsubscribe',
            endpoint: subscription.endpoint,
          }),
        });
        await subscription.unsubscribe();
      }
      setStatus('off');
    } catch {
      setError('Could not switch notifications off. Please try again.');
      setStatus('on');
    }
  };

  return (
    <div className="rounded-xl border border-line bg-canvas p-6 sm:p-8 space-y-5 max-w-xl lg:rounded-[26px]">
      <div className="flex items-center gap-2.5">
        {status === 'on' ? (
          <BellRing className="h-5 w-5 text-burgundy" />
        ) : (
          <Bell className="h-5 w-5 text-burgundy" />
        )}
        <h2 className="text-sm font-semibold text-charcoal">Push notifications</h2>
      </div>

      <p className="text-xs text-muted leading-relaxed">
        Get a notification on this device the moment new study material is
        published for your semester subjects — no need to keep checking the app.
      </p>

      {status === 'checking' || status === 'busy' ? (
        <p className="inline-flex items-center gap-2 text-xs font-medium text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          {status === 'busy' ? 'Updating…' : 'Checking…'}
        </p>
      ) : status === 'unconfigured' ? (
        <p className="rounded-lg bg-neutral-soft px-3.5 py-2.5 text-xs text-muted leading-relaxed">
          Notifications are being switched on for the app — check back here soon.
        </p>
      ) : status === 'unsupported' ? (
        <p className="rounded-lg bg-neutral-soft px-3.5 py-2.5 text-xs text-muted leading-relaxed">
          This browser can&apos;t receive push notifications. On iPhone or iPad,
          first install Azhimathi Mayam to your Home Screen (Share → Add to Home
          Screen), then open the installed app and enable notifications here.
        </p>
      ) : status === 'denied' ? (
        <p className="rounded-lg bg-neutral-soft px-3.5 py-2.5 text-xs text-muted leading-relaxed">
          Notifications are blocked for this site in your browser settings.
          Allow notifications for Azhimathi Mayam there, then come back and
          switch this on.
        </p>
      ) : status === 'on' ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-burgundy-tint px-3 py-1.5 text-xs font-semibold text-burgundy">
            <BellRing className="h-3.5 w-3.5" /> On for this device
          </span>
          <button
            type="button"
            onClick={disable}
            className="inline-flex items-center gap-1.5 rounded-md border border-line-strong bg-canvas px-3.5 py-2 text-xs font-semibold text-charcoal hover:bg-neutral-soft"
          >
            <BellOff className="h-3.5 w-3.5" /> Turn off
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={enable}
          className="inline-flex items-center gap-1.5 rounded-md bg-burgundy px-3.5 py-2 text-xs font-semibold text-white hover:bg-burgundy-deep"
        >
          <Bell className="h-3.5 w-3.5" /> Notify me on this device
        </button>
      )}

      {error ? <p className="text-xs font-medium text-red-700">{error}</p> : null}
    </div>
  );
}
