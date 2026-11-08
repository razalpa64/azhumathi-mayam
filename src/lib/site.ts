/**
 * Canonical site URL for SEO (metadataBase, sitemap, robots, JSON-LD).
 *
 * Priority:
 *  1. NEXT_PUBLIC_SITE_URL — set this to the production domain in Vercel
 *     (e.g. https://azhimathimayam.in). This is the one that matters.
 *  2. VERCEL_PROJECT_PRODUCTION_URL — Vercel injects this automatically.
 *  3. localhost — local development fallback.
 */
export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/+$/, '')}`;

  return 'http://localhost:3000';
}

export const SITE_NAME = 'Azhimathi Mayam';
export const SITE_NAME_MALAYALAM = 'അഴിമതി മയം';

export const SITE_DESCRIPTION =
  'Free study notes, previous year question papers, syllabus PDFs and exam revision materials for KTU, University of Calicut, MG University and Kannur students — organised by course, branch and semester.';

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
