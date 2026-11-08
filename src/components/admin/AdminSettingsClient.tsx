'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, HardDrive, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PasswordChangeForm } from '@/components/student/PasswordChangeForm';
import type { WebsiteSettings } from '@/types/database';

interface AdminSettingsClientProps {
  initialSettings: WebsiteSettings;
}

export function AdminSettingsClient({ initialSettings }: AdminSettingsClientProps) {
  const router = useRouter();
  const [noticesEnabled, setNoticesEnabled] = useState(initialSettings.notices_enabled);
  const [adsEnabled, setAdsEnabled] = useState(initialSettings.ads_enabled);
  const [requireConsent, setRequireConsent] = useState(initialSettings.require_ad_consent);
  const [allowCrossBrowse, setAllowCrossBrowse] = useState(
    initialSettings.allow_cross_programme_browsing
  );
  const [adsensePubId, setAdsensePubId] = useState(initialSettings.adsense_publisher_id || '');
  const [supportEmail, setSupportEmail] = useState(initialSettings.support_email || '');

  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSavedMsg(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          notices_enabled: noticesEnabled,
          ads_enabled: adsEnabled,
          require_ad_consent: requireConsent,
          allow_cross_programme_browsing: allowCrossBrowse,
          adsense_publisher_id: adsensePubId.trim() || null,
          support_email: supportEmail.trim() || null,
        }),
      });
      if (res.ok) {
        setSavedMsg('Platform configuration saved.');
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-charcoal">
          Platform & Security Settings
        </h1>
        <p className="mt-1 text-sm text-muted">
          Control global student portal capabilities, storage reference architecture, and administrator credentials.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Global Controls */}
        <form
          onSubmit={handleSaveSettings}
          className="lg:col-span-6 rounded-xl border border-line bg-canvas p-6 space-y-5 h-fit"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-charcoal">Global Portal Switches</h2>
            <span className="font-malayalam text-sm font-bold text-burgundy">അഴിമതി മയം</span>
          </div>

          {savedMsg ? (
            <div className="flex items-center gap-2 rounded-md border border-[#BBF7D0] bg-[#F0FDF4] px-3.5 py-2.5 text-xs font-medium text-[#166534]">
              <CheckCircle2 className="h-4 w-4" />
              <span>{savedMsg}</span>
            </div>
          ) : null}

          <div className="divide-y divide-line border-y border-line">
            <label className="flex items-center justify-between gap-4 py-3.5 cursor-pointer">
              <div>
                <p className="text-xs font-semibold text-charcoal">Homepage Notices Section</p>
                <p className="text-[11px] text-muted">
                  Show active announcements and exam updates on the student homepage.
                </p>
              </div>
              <input
                type="checkbox"
                checked={noticesEnabled}
                onChange={(e) => setNoticesEnabled(e.target.checked)}
                className="h-4 w-4 rounded accent-burgundy"
              />
            </label>

            <label className="flex items-center justify-between gap-4 py-3.5 cursor-pointer">
              <div>
                <p className="text-xs font-semibold text-charcoal">Cross-Programme Browsing</p>
                <p className="text-[11px] text-muted">
                  Allow students to browse other programmes while prioritizing their enrolled course.
                </p>
              </div>
              <input
                type="checkbox"
                checked={allowCrossBrowse}
                onChange={(e) => setAllowCrossBrowse(e.target.checked)}
                className="h-4 w-4 rounded accent-burgundy"
              />
            </label>

            <label className="flex items-center justify-between gap-4 py-3.5 cursor-pointer">
              <div>
                <p className="text-xs font-semibold text-charcoal">Advertisement Placements</p>
                <p className="text-[11px] text-muted">
                  Enable configured sponsor or AdSense slots on approved student pages.
                </p>
              </div>
              <input
                type="checkbox"
                checked={adsEnabled}
                onChange={(e) => setAdsEnabled(e.target.checked)}
                className="h-4 w-4 rounded accent-burgundy"
              />
            </label>

            <label className="flex items-center justify-between gap-4 py-3.5 cursor-pointer">
              <div>
                <p className="text-xs font-semibold text-charcoal">Require Student Ad Consent</p>
                <p className="text-[11px] text-muted">
                  Prompt students before rendering advertising network placements.
                </p>
              </div>
              <input
                type="checkbox"
                checked={requireConsent}
                onChange={(e) => setRequireConsent(e.target.checked)}
                className="h-4 w-4 rounded accent-burgundy"
              />
            </label>
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-charcoal">
                Google AdSense Publisher ID (Optional)
              </label>
              <input
                type="text"
                value={adsensePubId}
                onChange={(e) => setAdsensePubId(e.target.value)}
                placeholder="ca-pub-XXXXXXXXXXXXXXXX"
                className="h-9 w-full rounded-md border border-line-strong bg-canvas px-3 font-mono text-xs"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-charcoal">
                Institutional Support Contact (Optional)
              </label>
              <input
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                placeholder="support@yourdomain.edu"
                className="h-9 w-full rounded-md border border-line-strong bg-canvas px-3 text-xs"
              />
            </div>
          </div>

          {/* Storage Provider Reference Card */}
          <div className="rounded-lg border border-line bg-neutral-soft p-4 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-charcoal">
                <HardDrive className="h-3.5 w-3.5 text-burgundy" />
                <span>Active Storage Layer</span>
              </div>
              <Badge variant="burgundy">GoogleDriveLinkProvider</Badge>
            </div>
            <p className="text-[11px] text-muted leading-relaxed">
              Modular <code>StorageProvider</code> interface is active in manual sharing-link mode.
              Ready for future drop-in upgrades to Google Drive API, Supabase Storage, or Cloudflare R2.
            </p>
          </div>

          <Button type="submit" disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>Save Platform Settings</span>
          </Button>
        </form>

        {/* Admin Password Change */}
        <div className="lg:col-span-6 space-y-6">
          <PasswordChangeForm />
        </div>
      </div>
    </div>
  );
}
