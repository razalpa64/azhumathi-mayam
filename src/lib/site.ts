/** The live production address of the site. */
export const PRODUCTION_SITE_URL = 'https://azhumathimayam.invytra.in';

/**
 * Canonical site URL for SEO (metadataBase, sitemap, robots, JSON-LD).
 *
 * Priority:
 *  1. NEXT_PUBLIC_SITE_URL — explicit override (set in Vercel if the
 *     domain ever changes).
 *  2. PRODUCTION_SITE_URL — the real subdomain the site is served from,
 *     so canonical/sitemap/Open Graph URLs are correct out of the box.
 *     (VERCEL_PROJECT_PRODUCTION_URL is deliberately not used: it points
 *     at the *.vercel.app alias, not the public subdomain.)
 */
export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');

  return PRODUCTION_SITE_URL;
}

export const SITE_NAME = 'Azhimathi Mayam';
export const SITE_NAME_MALAYALAM = 'അഴിമതി മയം';

export const SITE_DESCRIPTION =
  'Free study notes, previous year question papers, syllabus PDFs and exam revision materials for KTU, University of Calicut, MG University, University of Kerala, Kannur University and CUSAT students — organised by course, branch and semester.';

export const SITE_KEYWORDS = [
  'KTU notes',
  'KTU previous year question papers',
  'KTU study materials',
  'Calicut University notes',
  'Calicut University question papers',
  'FYUGP notes',
  'study notes Kerala',
  'exam notes',
  'exam revision notes',
  'important questions',
  'B.Tech notes Kerala',
  'B.Sc notes',
  'B.Com notes',
  'BBA notes',
  'BCA notes',
  'syllabus PDF download',
  'semester notes',
  'Azhimathi Mayam',
  'അഴിമതി മയം',
];
