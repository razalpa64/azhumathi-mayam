'use client';

import { useEffect } from 'react';

/** Registers /sw.js in production only — dev stays cache-free. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Installability is a progressive enhancement; browsing works regardless
    });
  }, []);

  return null;
}
