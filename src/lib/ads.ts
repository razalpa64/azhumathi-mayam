import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getWebsiteSettings } from '@/lib/auth/session';
import { resolveAdsenseClientId } from '@/lib/adsense';
import type { AdPlacement, Advertisement } from '@/types/database';

/**
 * Fill in the AdSense client id when the ad row left it blank.
 *
 * The admin form asks for a publisher id and a slot id per advertisement, but
 * there is only ever one publisher for this site — so a row that carries just
 * the slot id should still serve, using the id saved in settings (or the
 * built-in one). Without this, forgetting one field meant a slot that silently
 * rendered nothing, which is exactly how "why are there no ads?" happens.
 */
function withResolvedClientId(
  ad: Advertisement,
  settingsPublisherId: string | null
): Advertisement {
  if (ad.provider_type !== 'adsense_slot' || ad.adsense_client_id) return ad;
  return { ...ad, adsense_client_id: resolveAdsenseClientId(settingsPublisherId) };
}

export async function getActiveAdvertisementsByPlacement(): Promise<{
  adsEnabled: boolean;
  requireConsent: boolean;
  adsensePublisherId: string | null;
  byPlacement: Partial<Record<AdPlacement, Advertisement>>;
}> {
  const settings = await getWebsiteSettings();
  if (!settings.ads_enabled) {
    return {
      adsEnabled: false,
      requireConsent: settings.require_ad_consent,
      adsensePublisherId: settings.adsense_publisher_id,
      byPlacement: {},
    };
  }

  const supabase = await createSupabaseServerClient();
  const nowIso = new Date().toISOString();

  const { data } = await supabase
    .from('advertisements')
    .select('*')
    .eq('is_enabled', true)
    .order('updated_at', { ascending: false });

  const byPlacement: Partial<Record<AdPlacement, Advertisement>> = {};
  for (const raw of (data || []) as Advertisement[]) {
    if (raw.start_date && raw.start_date > nowIso) continue;
    if (raw.end_date && raw.end_date <= nowIso) continue;
    if (!byPlacement[raw.placement]) {
      byPlacement[raw.placement] = withResolvedClientId(raw, settings.adsense_publisher_id);
    }
  }

  return {
    adsEnabled: true,
    requireConsent: settings.require_ad_consent,
    adsensePublisherId: settings.adsense_publisher_id,
    byPlacement,
  };
}

export type PublicAdConfig = {
  adsEnabled: boolean;
  requireConsent: boolean;
  ad: Advertisement | null;
};

/**
 * The ad a signed-out visitor is allowed to see.
 *
 * `advertisements` is RLS-guarded to authenticated students on purpose, which
 * is right inside the app — but it also means the public pages could never see
 * a configured ad through the normal server client. They would render nothing,
 * silently, even with ads switched on. The row itself is public marketing
 * configuration (headline, sponsor name, AdSense ids), so this reader uses the
 * service-role client, the same way the website settings are read.
 *
 * Never throws: a public page has to render with or without a database.
 */
export async function getPublicAd(placement: AdPlacement): Promise<PublicAdConfig> {
  try {
    const settings = await getWebsiteSettings();
    if (!settings.ads_enabled) {
      return { adsEnabled: false, requireConsent: settings.require_ad_consent, ad: null };
    }

    const admin = createSupabaseAdminClient();
    const nowIso = new Date().toISOString();
    const { data } = await admin
      .from('advertisements')
      .select('*')
      .eq('placement', placement)
      .eq('is_enabled', true)
      .order('updated_at', { ascending: false })
      .limit(10);

    const found = ((data || []) as Advertisement[]).find((row) => {
      if (row.start_date && row.start_date > nowIso) return false;
      if (row.end_date && row.end_date <= nowIso) return false;
      return true;
    });
    const ad = found ? withResolvedClientId(found, settings.adsense_publisher_id) : null;

    return { adsEnabled: true, requireConsent: settings.require_ad_consent, ad };
  } catch {
    return { adsEnabled: false, requireConsent: false, ad: null };
  }
}
