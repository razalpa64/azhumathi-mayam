'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Power, ShieldCheck, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import type { AdPlacement, Advertisement, WebsiteSettings } from '@/types/database';

const PLACEMENT_LABELS: Record<AdPlacement, string> = {
  homepage_banner: 'Homepage Banner Area',
  between_listings: 'Between Resource Listings',
  subject_page: 'Subject Filter Page',
  below_pdf_preview: 'Below PDF Preview',
  dedicated_partner_section: 'Dedicated Partner Section',
};

interface AdsManagerClientProps {
  initialAds: Advertisement[];
  initialSettings: WebsiteSettings;
}

export function AdsManagerClient({ initialAds, initialSettings }: AdsManagerClientProps) {
  const router = useRouter();
  const [ads, setAds] = useState(initialAds);
  const [adsEnabled, setAdsEnabled] = useState(initialSettings.ads_enabled);
  const [requireConsent, setRequireConsent] = useState(initialSettings.require_ad_consent);
  const [togglingMaster, setTogglingMaster] = useState(false);

  const [name, setName] = useState('');
  const [placement, setPlacement] = useState<AdPlacement>('homepage_banner');
  const [providerType, setProviderType] = useState<'custom_sponsor' | 'adsense_slot'>(
    'custom_sponsor'
  );
  const [sponsorName, setSponsorName] = useState('');
  const [headline, setHeadline] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [ctaLabel, setCtaLabel] = useState('Learn More');
  const [targetUrl, setTargetUrl] = useState('');
  const [adsenseClientId, setAdsenseClientId] = useState(
    initialSettings.adsense_publisher_id || ''
  );
  const [adsenseSlotId, setAdsenseSlotId] = useState('');
  const [isEnabled, setIsEnabled] = useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function updateGlobalAdSettings(nextEnabled: boolean, nextConsent: boolean) {
    setTogglingMaster(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          ads_enabled: nextEnabled,
          require_ad_consent: nextConsent,
        }),
      });
      if (res.ok) {
        setAdsEnabled(nextEnabled);
        setRequireConsent(nextConsent);
        router.refresh();
      }
    } finally {
      setTogglingMaster(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/advertisements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          name: name.trim(),
          placement,
          provider_type: providerType,
          sponsor_name: sponsorName.trim() || null,
          headline: headline.trim() || null,
          body_text: bodyText.trim() || null,
          cta_label: ctaLabel.trim() || null,
          target_url: targetUrl.trim() || null,
          adsense_client_id: adsenseClientId.trim() || null,
          adsense_slot_id: adsenseSlotId.trim() || null,
          is_enabled: isEnabled,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Could not create placement.');
        return;
      }
      setAds((prev) => [data.advertisement, ...prev]);
      setName('');
      setHeadline('');
      setBodyText('');
      setTargetUrl('');
      setAdsenseSlotId('');
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleTogglePlacement(ad: Advertisement) {
    const res = await fetch(`/api/admin/advertisements/${ad.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ is_enabled: !ad.is_enabled }),
    });
    if (res.ok) {
      const data = await res.json();
      setAds((prev) => prev.map((item) => (item.id === ad.id ? data.advertisement : item)));
    }
  }

  async function handleDelete(ad: Advertisement) {
    if (!window.confirm(`Delete advertisement placement "${ad.name}"?`)) return;
    const res = await fetch(`/api/admin/advertisements/${ad.id}`, {
      method: 'DELETE',
      credentials: 'same-origin',
    });
    if (res.ok) {
      setAds((prev) => prev.filter((item) => item.id !== ad.id));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-line pb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-charcoal">
            Advertisement & Monetization Layer
          </h1>
          <p className="mt-1 text-sm text-muted">
            Configure clearly labeled, policy-compliant partner or Google AdSense placements on student pages.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={togglingMaster}
            onClick={() => updateGlobalAdSettings(!adsEnabled, requireConsent)}
            className={`inline-flex h-9 items-center gap-2 rounded-md border px-3.5 text-xs font-semibold cursor-pointer ${
              adsEnabled
                ? 'border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]'
                : 'border-line-strong bg-neutral-soft text-charcoal'
            }`}
          >
            <Power className="h-3.5 w-3.5" />
            <span>Global Ads: {adsEnabled ? 'Enabled' : 'Disabled'}</span>
          </button>

          <label className="inline-flex h-9 items-center gap-2 rounded-md border border-line bg-canvas px-3 text-xs font-medium text-charcoal cursor-pointer">
            <input
              type="checkbox"
              checked={requireConsent}
              disabled={togglingMaster}
              onChange={(e) => updateGlobalAdSettings(adsEnabled, e.target.checked)}
              className="rounded accent-burgundy"
            />
            <span>Require Student Consent</span>
          </label>
        </div>
      </div>

      {/* Policy Safeguards Banner */}
      <div className="rounded-xl border border-line bg-neutral-soft/75 p-4 flex items-start gap-3 text-xs text-muted">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-burgundy" />
        <p className="leading-relaxed">
          <strong className="text-charcoal">Built-in UX & Network Compliance:</strong> Placements
          are never rendered on Login pages, Admin routes, or over PDF content, and never imitate
          download buttons. Analytics and earnings must be read directly from your verified ad
          network console (such as Google AdSense) — this platform never fabricates impression or
          revenue figures.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-xs text-[#991B1B]">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Configure Placement Form */}
        <form
          onSubmit={handleCreate}
          className="lg:col-span-5 rounded-xl border border-line bg-canvas p-5 space-y-4 h-fit"
        >
          <h2 className="text-sm font-semibold text-charcoal">Configure Placement</h2>

          <div>
            <label className="mb-1 block text-xs font-semibold text-charcoal">
              Internal Label *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., GATE 2027 Preparation Partner"
              className="h-9 w-full rounded-md border border-line-strong bg-canvas px-3 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-charcoal">Slot</label>
              <select
                value={placement}
                onChange={(e) => setPlacement(e.target.value as AdPlacement)}
                className="h-9 w-full rounded-md border border-line-strong bg-canvas px-2 text-xs"
              >
                {(Object.keys(PLACEMENT_LABELS) as AdPlacement[]).map((key) => (
                  <option key={key} value={key}>
                    {PLACEMENT_LABELS[key]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-charcoal">Mode</label>
              <select
                value={providerType}
                onChange={(e) =>
                  setProviderType(e.target.value as 'custom_sponsor' | 'adsense_slot')
                }
                className="h-9 w-full rounded-md border border-line-strong bg-canvas px-2 text-xs"
              >
                <option value="custom_sponsor">Direct Sponsor Card</option>
                <option value="adsense_slot">Google AdSense Slot</option>
              </select>
            </div>
          </div>

          {providerType === 'custom_sponsor' ? (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-charcoal">
                  Sponsor Organization
                </label>
                <input
                  type="text"
                  value={sponsorName}
                  onChange={(e) => setSponsorName(e.target.value)}
                  placeholder="Academic Partner Name"
                  className="h-9 w-full rounded-md border border-line-strong bg-canvas px-3 text-xs"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-charcoal">Headline</label>
                <input
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="Short educational headline"
                  className="h-9 w-full rounded-md border border-line-strong bg-canvas px-3 text-xs"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-charcoal">Body Copy</label>
                <textarea
                  rows={2}
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  placeholder="Clear, non-deceptive description..."
                  className="w-full rounded-md border border-line-strong bg-canvas p-2.5 text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-charcoal">
                    Destination URL
                  </label>
                  <input
                    type="url"
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                    placeholder="https://..."
                    className="h-9 w-full rounded-md border border-line-strong bg-canvas px-2.5 text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-charcoal">
                    Button Text
                  </label>
                  <input
                    type="text"
                    value={ctaLabel}
                    onChange={(e) => setCtaLabel(e.target.value)}
                    className="h-9 w-full rounded-md border border-line-strong bg-canvas px-2.5 text-xs"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-charcoal">
                  AdSense Publisher Client ID
                </label>
                <input
                  type="text"
                  value={adsenseClientId}
                  onChange={(e) => setAdsenseClientId(e.target.value)}
                  placeholder="ca-pub-XXXXXXXXXXXXXXXX"
                  className="h-9 w-full rounded-md border border-line-strong bg-canvas px-3 font-mono text-xs"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-charcoal">
                  AdSense Unit Slot ID
                </label>
                <input
                  type="text"
                  value={adsenseSlotId}
                  onChange={(e) => setAdsenseSlotId(e.target.value)}
                  placeholder="1234567890"
                  className="h-9 w-full rounded-md border border-line-strong bg-canvas px-3 font-mono text-xs"
                />
              </div>
            </div>
          )}

          <label className="flex items-center gap-2 text-xs text-charcoal cursor-pointer">
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={(e) => setIsEnabled(e.target.checked)}
              className="rounded accent-burgundy"
            />
            <span>Enable this placement slot</span>
          </label>

          <Button type="submit" size="sm" disabled={saving} className="w-full">
            <Plus className="h-3.5 w-3.5" />
            <span>{saving ? 'Saving...' : 'Create Placement'}</span>
          </Button>
        </form>

        {/* Configured Placements List */}
        <div className="lg:col-span-7 space-y-3">
          {ads.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title="No advertisement placements configured"
              description="Add a sponsor placement or Google AdSense slot on the left whenever you are ready to enable monetization."
            />
          ) : (
            ads.map((ad) => (
              <div
                key={ad.id}
                className="rounded-xl border border-line bg-canvas p-4 space-y-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={ad.is_enabled ? 'success' : 'muted'}>
                      {ad.is_enabled ? 'Slot Active' : 'Slot Paused'}
                    </Badge>
                    <Badge variant="burgundy">{PLACEMENT_LABELS[ad.placement]}</Badge>
                    <Badge variant="neutral">
                      {ad.provider_type === 'adsense_slot' ? 'AdSense' : 'Direct Sponsor'}
                    </Badge>
                  </div>
                </div>

                <h3 className="text-sm font-semibold text-charcoal">{ad.name}</h3>
                {ad.headline ? <p className="text-xs text-muted">{ad.headline}</p> : null}

                <div className="flex items-center justify-end gap-2 border-t border-line pt-2.5">
                  <button
                    type="button"
                    onClick={() => handleTogglePlacement(ad)}
                    className="rounded border border-line px-2.5 py-1 text-[11px] font-medium hover:bg-neutral-soft cursor-pointer"
                  >
                    {ad.is_enabled ? 'Pause Slot' : 'Enable Slot'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(ad)}
                    className="inline-flex h-7 w-7 items-center justify-center rounded border border-[#FECACA] bg-[#FEF2F2] text-[#991B1B] cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
