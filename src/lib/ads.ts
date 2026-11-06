import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getWebsiteSettings } from '@/lib/auth/session';
import type { AdPlacement, Advertisement } from '@/types/database';

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
      byPlacement[raw.placement] = raw;
    }
  }

  return {
    adsEnabled: true,
    requireConsent: settings.require_ad_consent,
    adsensePublisherId: settings.adsense_publisher_id,
    byPlacement,
  };
}
