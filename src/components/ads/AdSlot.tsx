'use client';

import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import type { Advertisement } from '@/types/database';
import { cn } from '@/lib/utils';

interface AdSlotProps {
  ad?: Advertisement | null;
  adsEnabled: boolean;
  requireConsent?: boolean;
  className?: string;
}

const CONSENT_STORAGE_KEY = 'azm_ad_consent_v1';

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[];
  }
}

export function AdSlot({ ad, adsEnabled, requireConsent = false, className }: AdSlotProps) {
  const [consented, setConsented] = useState(!requireConsent);

  // Ask the AdSense library (loaded in the root layout) to fill this
  // unit. Runs once per mounted slot; needs the consent gate open first.
  useEffect(() => {
    if (ad?.provider_type !== 'adsense_slot' || !ad.adsense_client_id || !ad.adsense_slot_id) {
      return;
    }
    if (requireConsent && !consented) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // Library blocked (ad blocker) — the labelled frame simply stays.
    }
  }, [ad?.id, ad?.provider_type, ad?.adsense_client_id, ad?.adsense_slot_id, requireConsent, consented]);

  useEffect(() => {
    if (!requireConsent) {
      setConsented(true);
      return;
    }
    try {
      const saved = window.localStorage.getItem(CONSENT_STORAGE_KEY);
      if (saved === 'granted') setConsented(true);
    } catch {
      // Ignore storage access errors
    }
  }, [requireConsent]);

  if (!adsEnabled || !ad || !ad.is_enabled) {
    return null;
  }

  if (requireConsent && !consented) {
    return (
      <aside
        aria-label="Advertising consent preference"
        className={cn(
          'rounded-lg border border-line bg-neutral-soft px-4 py-3 text-xs text-muted flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3',
          className
        )}
      >
        <span>
          The occasional sponsored notice helps keep അഴിമതി മയം running. Show them?
        </span>
        <button
          type="button"
          onClick={() => {
            try {
              window.localStorage.setItem(CONSENT_STORAGE_KEY, 'granted');
            } catch {
              // Ignore
            }
            setConsented(true);
          }}
          className="shrink-0 rounded border border-line-strong bg-canvas px-3 py-1 text-xs font-medium text-charcoal hover:bg-neutral-inset cursor-pointer"
        >
          Allow Sponsored Notices
        </button>
      </aside>
    );
  }

  if (ad.provider_type === 'adsense_slot' && ad.adsense_client_id && ad.adsense_slot_id) {
    return (
      <aside
        aria-label="Sponsored advertisement"
        className={cn(
          'rounded-lg border border-line bg-neutral-soft/65 p-4',
          className
        )}
      >
        <div className="mb-2 flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-muted">
          <span>Advertisement</span>
          <span>Google AdSense Slot</span>
        </div>
        <div className="min-h-[90px] flex items-center justify-center rounded border border-dashed border-line-strong bg-canvas px-4 py-4 text-xs text-muted">
          <ins
            className="adsbygoogle block w-full"
            data-ad-client={ad.adsense_client_id}
            data-ad-slot={ad.adsense_slot_id}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        </div>
      </aside>
    );
  }

  return (
    <aside
      aria-label="Sponsored partner placement"
      className={cn(
        'rounded-lg border border-line bg-neutral-soft/75 px-5 py-4',
        className
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
            <span className="rounded border border-line-strong bg-canvas px-1.5 py-0.5 text-[10px]">
              Sponsored
            </span>
            {ad.sponsor_name ? <span>{ad.sponsor_name}</span> : null}
          </div>
          {ad.headline ? (
            <h4 className="text-sm font-semibold text-charcoal">{ad.headline}</h4>
          ) : (
            <h4 className="text-sm font-semibold text-charcoal">{ad.name}</h4>
          )}
          {ad.body_text ? (
            <p className="text-xs text-muted leading-relaxed max-w-2xl">{ad.body_text}</p>
          ) : null}
        </div>

        {ad.target_url ? (
          <a
            href={ad.target_url}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-line-strong bg-canvas px-3.5 py-2 text-xs font-semibold text-charcoal hover:bg-neutral-inset transition-colors"
          >
            <span>{ad.cta_label || 'Learn More'}</span>
            <ExternalLink className="h-3.5 w-3.5 text-muted" />
          </a>
        ) : null}
      </div>
    </aside>
  );
}
