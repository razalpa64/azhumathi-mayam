'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Download, Share, Smartphone, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type IOSBrowser = 'safari' | 'chrome' | 'firefox' | 'edge' | 'other';

interface InstallState {
  /** Chromium is offering its own install UI (Android, desktop Chrome/Edge). */
  canPrompt: boolean;
  isIOS: boolean;
  installed: boolean;
  justInstalled: boolean;
  /** The page is inside an app's own browser (WhatsApp, Instagram, …). */
  inAppBrowser: string | null;
  browser: IOSBrowser;
  install: () => Promise<void>;
}

const HIDDEN_KEY = 'app-install-card-hidden-at';
const HIDDEN_FOR_DAYS = 30;

/** Which in-app browser is showing this page, if any. */
function detectInAppBrowser(ua: string): string | null {
  if (/WhatsApp/i.test(ua)) return 'WhatsApp';
  if (/Instagram/i.test(ua)) return 'Instagram';
  if (/FBAN|FBAV|FB_IAB|Facebook/i.test(ua)) return 'Facebook';
  if (/LinkedInApp/i.test(ua)) return 'LinkedIn';
  if (/Snapchat/i.test(ua)) return 'Snapchat';
  if (/Line\//i.test(ua)) return 'LINE';
  if (/Twitter/i.test(ua)) return 'X';
  if (/GSA\//i.test(ua)) return 'Google';
  return null;
}

function detectIOSBrowser(ua: string): IOSBrowser {
  if (/CriOS/.test(ua)) return 'chrome';
  if (/FxiOS/.test(ua)) return 'firefox';
  if (/EdgiOS/.test(ua)) return 'edge';
  if (/Safari/.test(ua)) return 'safari';
  return 'other';
}

/**
 * Is this page already running as an installed app?
 *
 * iOS reports a home-screen web app through `navigator.standalone`; the
 * display-mode media query alone misses it because WebKit reports a manifest
 * "standalone" app as "fullscreen".
 */
function detectInstalled(): boolean {
  const nav = window.navigator as Navigator & { standalone?: boolean };
  if (nav.standalone === true) return true;
  return ['standalone', 'fullscreen', 'minimal-ui'].some((mode) =>
    window.matchMedia(`(display-mode: ${mode})`).matches
  );
}

function useInstallState(): InstallState {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [installed, setInstalled] = useState(true);
  const [justInstalled, setJustInstalled] = useState(false);
  const [inAppBrowser, setInAppBrowser] = useState<string | null>(null);
  const [browser, setBrowser] = useState<IOSBrowser>('other');

  useEffect(() => {
    const ua = window.navigator.userAgent;
    const iPadAsMac = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    setIsIOS(/iphone|ipad|ipod/i.test(ua) || iPadAsMac);
    setBrowser(detectIOSBrowser(ua));
    setInAppBrowser(detectInAppBrowser(ua));
    setInstalled(detectInstalled());

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setPromptEvent(null);
      setInstalled(true);
      setJustInstalled(true);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice.catch(() => null);
    if (choice?.outcome === 'accepted') {
      setJustInstalled(true);
      setInstalled(true);
    }
    setPromptEvent(null);
  }, [promptEvent]);

  return {
    canPrompt: Boolean(promptEvent),
    isIOS,
    installed,
    justInstalled,
    inAppBrowser,
    browser,
    install,
  };
}

/**
 * The steps that actually apply to the phone in hand.
 *
 * Installing is manual on iPhone — Apple exposes no install prompt and a site
 * cannot show one — so the only correct advice is the browser's own Share
 * menu. It is not Safari-only advice any more: since iOS 16.4 the Share menu
 * of Chrome, Edge and Firefox offers "Add to Home Screen" too, and what it
 * installs runs as a real home-screen web app (same WebKit engine, same
 * standalone window, same push). Telling a Chrome user to "use Safari" sends
 * them somewhere they don't need to go.
 *
 * An in-app browser is a different problem: WhatsApp, Instagram and friends
 * open links in a bare WebView with no Share menu at all, so the first step
 * there is getting out of it.
 */
function installSteps(state: InstallState): string[] {
  if (state.inAppBrowser) {
    return [
      `You are reading this inside ${state.inAppBrowser}, which has no “Add to Home Screen”.`,
      'Tap the ⋯ or Share button at the top and choose “Open in Safari” (or “Open in Chrome”).',
      'In the browser, use its Share menu and tap “Add to Home Screen”.',
    ];
  }

  switch (state.browser) {
    case 'chrome':
      return [
        'Tap the ⋮ menu in Chrome, then “Share…”.',
        'Choose “Add to Home Screen”.',
        'Tap “Add”.',
      ];
    case 'firefox':
      return ['Tap the Share icon in Firefox.', 'Choose “Add to Home Screen”.', 'Tap “Add”.'];
    case 'edge':
      return ['Tap the ⋯ menu in Edge, then Share.', 'Choose “Add to Home Screen”.', 'Tap “Add”.'];
    case 'safari':
      return [
        'Tap the Share button — the square with an arrow pointing up.',
        'Scroll the sheet and tap “Add to Home Screen”.',
        'Tap “Add” in the corner.',
      ];
    default:
      return [
        'Open this browser’s Share menu.',
        'Choose “Add to Home Screen”.',
        'Tap “Add”.',
      ];
  }
}

function IOSNote({ state }: { state: InstallState }) {
  if (!state.isIOS || state.inAppBrowser || state.browser === 'safari') return null;
  return (
    <span className="mt-1.5 block text-[10px] leading-relaxed text-muted">
      Works in Chrome, Edge and Firefox on iOS 16.4 or later. On an older iPhone, open this page
      in Safari.
    </span>
  );
}

/**
 * "Install app" — one button, three realities:
 *  - Chrome/Android (incl. desktops): fires the native install prompt
 *  - iPhone/iPad: Apple has no prompt API, so it opens Share → Add to Home
 *    Screen, worded for the browser actually in use
 *  - Already installed / unsupported: renders nothing (and after a
 *    successful install, a quiet "App installed" confirmation)
 */
export function InstallAppButton({ className }: { className?: string }) {
  const state = useInstallState();
  const [showHelp, setShowHelp] = useState(false);

  if (state.installed) return null;

  if (state.justInstalled) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-burgundy">
        <Check className="h-4 w-4" />
        App installed — it&apos;s on your home screen
      </span>
    );
  }

  // Nothing to offer (no prompt and not an iPhone): stay invisible.
  if (!state.canPrompt && !state.isIOS) return null;

  const steps = installSteps(state);

  return (
    <span className="inline-block">
      <button
        type="button"
        onClick={() => (state.canPrompt ? state.install() : setShowHelp((value) => !value))}
        aria-expanded={state.canPrompt ? undefined : showHelp}
        className={cn(
          'inline-flex h-10 items-center gap-2 rounded-full bg-burgundy px-4 text-[13px] font-semibold text-white shadow-[0_10px_18px_-10px_rgba(121,0,0,0.7)] transition-all hover:bg-burgundy-dark active:scale-95 cursor-pointer',
          className
        )}
      >
        {state.canPrompt ? (
          <Download className="h-4 w-4" />
        ) : (
          <Smartphone className="h-4 w-4" />
        )}
        <span>{state.canPrompt ? 'Install app' : 'Add to Home Screen'}</span>
      </button>

      {showHelp ? (
        <span className="mt-2 block max-w-[280px] rounded-2xl border border-burgundy-border bg-burgundy-tint px-3.5 py-3 text-left text-xs leading-relaxed text-charcoal">
          <ol className="space-y-1.5">
            {steps.map((step, index) => (
              <li key={step} className="flex gap-1.5">
                <span className="font-bold text-burgundy">{index + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <IOSNote state={state} />
          <span className="mt-2 block text-[11px] text-muted">
            Opens full-screen, with the icon on your home screen.
          </span>
        </span>
      ) : null}
    </span>
  );
}

/**
 * The same offer, as a card the dashboard can show once.
 *
 * The install button used to live only inside the navigation sheet, so a
 * student who never opened that sheet never learned the app could be
 * installed at all — and on an iPhone there is no automatic prompt to fall
 * back on. Dismissing the card hides it for a month, not forever.
 */
export function InstallAppCard({ className }: { className?: string }) {
  const state = useInstallState();
  const [hidden, setHidden] = useState(true);
  const [showSteps, setShowSteps] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(HIDDEN_KEY);
      if (!stored) {
        setHidden(false);
        return;
      }
      const days = (Date.now() - Number(stored)) / 86_400_000;
      setHidden(days < HIDDEN_FOR_DAYS);
    } catch {
      setHidden(false);
    }
  }, []);

  function dismiss() {
    setHidden(true);
    try {
      window.localStorage.setItem(HIDDEN_KEY, String(Date.now()));
    } catch {
      // Private mode — the card simply returns next visit.
    }
  }

  if (state.installed || hidden) return null;
  if (!state.canPrompt && !state.isIOS) return null;

  const steps = installSteps(state);

  return (
    <div
      className={cn(
        'anim-rise flex items-start gap-3 rounded-2xl border border-burgundy-border bg-burgundy-tint px-4 py-3',
        className
      )}
    >
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-burgundy text-canvas">
        {state.canPrompt ? <Download className="h-4 w-4" /> : <Share className="h-4 w-4" />}
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-charcoal">
          {state.canPrompt ? 'Install Azhimathi Mayam' : 'Add the app to your home screen'}
        </p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
          {state.canPrompt
            ? 'One tap, then it opens full-screen like any other app.'
            : 'Opens full-screen, keeps your notes one tap away, and works on a weak connection.'}
        </p>

        <button
          type="button"
          onClick={() => (state.canPrompt ? state.install() : setShowSteps((value) => !value))}
          aria-expanded={state.canPrompt ? undefined : showSteps}
          className="mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-burgundy px-3.5 py-1.5 text-[11px] font-semibold text-white"
        >
          {state.canPrompt ? <Download className="h-3.5 w-3.5" /> : <Share className="h-3.5 w-3.5" />}
          {state.canPrompt ? 'Install app' : showSteps ? 'Hide the steps' : 'Show me how'}
        </button>

        {!state.canPrompt && showSteps ? (
          <div className="mt-2.5 rounded-xl bg-canvas/80 px-3 py-2.5 text-[11px] leading-relaxed text-charcoal">
            <ol className="space-y-1.5">
              {steps.map((step, index) => (
                <li key={step} className="flex gap-1.5">
                  <span className="font-bold text-burgundy">{index + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <IOSNote state={state} />
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={dismiss}
        aria-label="Hide this hint"
        className="-mr-1 -mt-1 flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted hover:bg-black/5 hover:text-charcoal"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
