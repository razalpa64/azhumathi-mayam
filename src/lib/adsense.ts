/**
 * Google AdSense account for this site.
 *
 * The publisher ID is public information (it appears in the page source
 * and in ads.txt), so it is kept here as the built-in default. It can be
 * overridden in Admin → Settings (“AdSense Publisher ID”); the value from
 * settings wins whenever one is saved there.
 */
export const FALLBACK_ADSENSE_CLIENT_ID = 'ca-pub-2630095534690757';

export function resolveAdsenseClientId(settingsPublisherId?: string | null): string {
  const fromSettings = (settingsPublisherId || '').trim();
  return fromSettings || FALLBACK_ADSENSE_CLIENT_ID;
}
