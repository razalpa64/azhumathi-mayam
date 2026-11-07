'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Download, Share, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'azm_install_prompt_dismissed_at';
/** "Not now" means not now — don't ask again for two weeks. */
const DISMISS_DAYS = 14;

function recentlyDismissed(): boolean {
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    return Date.now() - Number(raw) < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function rememberDismissal() {
  try {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    // Private browsing etc. — worst case it asks again next visit
  }
}

/**
 * The friendly install popup. It only exists when installing is actually
 * possible (Chrome's prompt captured, or iOS where it teaches the two
 * taps), never when already installed, and it shows on the Home screen
 * after the page has settled — once, unless invited back by time.
 * Mounted only on /dashboard by the shell.
 */
export function InstallPromptCard() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [visible, setVisible] = useState(false);
  const [showIOSHelp, setShowIOSHelp] = useState(false);

  useEffect(() => {
    const nav = window.navigator as Navigator & { standalone?: boolean };
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
    if (standalone || recentlyDismissed()) return;

    setIsIOS(/iphone|ipad|ipod/i.test(window.navigator.userAgent));

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      rememberDismissal();
      setVisible(false);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);

    // Let the home screen finish arriving before gliding in
    const timer = window.setTimeout(() => setVisible(true), 1200);

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      window.clearTimeout(timer);
    };
  }, []);

  function dismiss() {
    rememberDismissal();
    setVisible(false);
  }

  async function handleInstall() {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice.catch(() => null);
        if (choice?.outcome === 'accepted') {
          rememberDismissal();
          setVisible(false);
          return;
        }
      } catch {
        // The shared prompt was already used elsewhere — just close
      }
      dismiss();
      return;
    }
    // iOS: no prompt API — teach the two taps in place
    setShowIOSHelp((v) => !v);
  }

  if (!visible || (!deferredPrompt && !isIOS)) return null;

  return (
    <div
      role="dialog"
      aria-label="Install Azhimathi Mayam app"
      className="anim-sheet fixed inset-x-3 bottom-[92px] z-50 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[364px] lg:bottom-6"
    >
      <div className="relative rounded-[24px] border border-line bg-canvas p-4 shadow-[0_24px_48px_-16px_rgba(36,7,7,0.45)]">
        <button
          type="button"
          onClick={dismiss}
          aria-label="Not now"
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-muted transition-colors hover:bg-neutral-soft hover:text-charcoal cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3.5 pr-6">
          <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[14px] ring-1 ring-line">
            <Image
              src="/brand/logo.png"
              alt=""
              width={48}
              height={48}
              className="h-full w-full object-cover"
            />
          </span>
          <div className="min-w-0">
            <p className="text-[15px] font-bold leading-tight text-charcoal">
              Install <span className="font-logo">അഴിമതി മയം</span>
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Put the app on your home screen — opens full-screen, one tap to
              your notes, no browser in the way.
            </p>
          </div>
        </div>

        {showIOSHelp && isIOS ? (
          <p className="mt-3 rounded-2xl border border-burgundy-border bg-burgundy-tint px-3.5 py-3 text-xs leading-relaxed text-charcoal">
            Tap the <Share className="inline h-3.5 w-3.5 -translate-y-px text-burgundy" />{' '}
            <span className="font-semibold">Share</span> button below, then{' '}
            <span className="font-semibold">“Add to Home Screen”</span>. That&apos;s it —
            the icon lands next to your other apps.
          </p>
        ) : null}

        <div className="mt-3.5 flex items-center gap-2">
          <button
            type="button"
            onClick={handleInstall}
            className={cn(
              'inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-burgundy px-4 text-[13px] font-semibold text-white transition-all hover:bg-burgundy-dark active:scale-[0.98] cursor-pointer'
            )}
          >
            <Download className="h-4 w-4" />
            <span>{isIOS && !deferredPrompt ? 'How to install' : 'Install app'}</span>
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="inline-flex h-10 items-center justify-center rounded-full px-4 text-[13px] font-semibold text-muted transition-colors hover:bg-neutral-soft hover:text-charcoal cursor-pointer"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
