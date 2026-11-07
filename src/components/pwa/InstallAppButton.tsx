'use client';

import { useEffect, useState } from 'react';
import { Check, Share, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * "Install app" — one button, three realities:
 *  - Chrome/Android (incl. desktops): fires the native install prompt
 *  - iPhone/iPad: Apple has no prompt API, so it opens the two-tap
 *    Share → Add to Home Screen instructions instead
 *  - Already installed / unsupported: renders nothing (and after a
 *    successful install, a quiet "App installed" confirmation)
 */
export function InstallAppButton({ className }: { className?: string }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [standalone, setStandalone] = useState(true);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSHelp, setShowIOSHelp] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);

  useEffect(() => {
    const nav = window.navigator as Navigator & { standalone?: boolean };
    setStandalone(
      window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true
    );
    setIsIOS(/iphone|ipad|ipod/i.test(window.navigator.userAgent));

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setDeferredPrompt(null);
      setJustInstalled(true);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (standalone) return null;

  if (justInstalled) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-burgundy">
        <Check className="h-4 w-4" />
        App installed — it&apos;s on your home screen
      </span>
    );
  }

  // Nothing to offer (prompt not available on this browser): stay invisible
  if (!deferredPrompt && !isIOS) return null;

  async function handleClick() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice.catch(() => null);
      if (choice?.outcome === 'accepted') setJustInstalled(true);
      setDeferredPrompt(null);
      return;
    }
    setShowIOSHelp((v) => !v);
  }

  return (
    <span className="inline-block">
      <button
        type="button"
        onClick={handleClick}
        aria-expanded={isIOS ? showIOSHelp : undefined}
        className={cn(
          'inline-flex h-10 items-center gap-2 rounded-full bg-burgundy px-4 text-[13px] font-semibold text-white shadow-[0_10px_18px_-10px_rgba(121,0,0,0.7)] transition-all hover:bg-burgundy-dark active:scale-95 cursor-pointer',
          className
        )}
      >
        <Smartphone className="h-4 w-4" />
        <span>Install app</span>
      </button>

      {isIOS && showIOSHelp ? (
        <span className="mt-2 block max-w-[260px] rounded-2xl border border-burgundy-border bg-burgundy-tint px-3.5 py-3 text-left text-xs leading-relaxed text-charcoal">
          Tap the <Share className="inline h-3.5 w-3.5 -translate-y-px text-burgundy" />{' '}
          <span className="font-semibold">Share</span> button in Safari, then{' '}
          <span className="font-semibold">“Add to Home Screen”</span>. The app icon lands
          on your home screen, full-screen and one tap away.
        </span>
      ) : null}
    </span>
  );
}
