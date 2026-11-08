import type { Metadata } from 'next';
import { unstable_cache } from 'next/cache';
import { redirect } from 'next/navigation';
import { getAuthenticatedProfile, isStaffRole } from '@/lib/auth/session';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { fetchAllRows } from '@/lib/supabase/fetch-all';
import {
  LandingPage,
  LANDING_FAQS,
  type LandingStats,
} from '@/components/landing/LandingPage';
import { SITE_DESCRIPTION } from '@/lib/site';
import { UNIVERSITY_SCALES } from '@/lib/university-grades';

export const metadata: Metadata = {
  title: {
    absolute:
      'Azhimathi Mayam — Study Notes, Question Papers & Syllabus | KTU, Calicut University',
  },
  description: SITE_DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: '/',
    title: 'Azhimathi Mayam — Study Notes, Question Papers & Syllabus',
    description: SITE_DESCRIPTION,
  },
};

// Public, search-facing stats. Best-effort: if the database is
// unreachable the landing page simply renders without the numbers.
// The numbers require counting three tables plus a paged
// pass over `subjects`; doing that per visit was a large slice of the
// first-paint time for every new visitor. Cached for five minutes.
const loadPublicStats = unstable_cache(
  async () => {
    let stats: LandingStats | null = null;
    let universities: string[] = [];
    try {
      const admin = createSupabaseAdminClient();
      const [uniRes, progRes, subjRes, resRes] = await Promise.all([
        admin
          .from('universities')
          .select('name')
          .eq('is_active', true)
          .order('display_order')
          .order('name'),
        admin.from('programmes').select('id').eq('is_active', true).order('display_order'),
        admin
          .from('subjects')
          .select('id', { count: 'exact', head: true })
          .eq('publication_status', 'published'),
        admin
          .from('resources')
          .select('id', { count: 'exact', head: true })
          .eq('publication_status', 'published'),
      ]);
      universities = (uniRes.data || []).map((u) => u.name as string).filter(Boolean);

      // Only programmes that actually have published subjects are counted.
      // The taxonomy carries every degree we plan to support (PG included),
      // and advertising "12 programmes" when half open onto nothing is the
      // fastest way to lose a visitor who joins for one of them. One
      // paginated pass over subject ids beats a count query per programme.
      const programmeIds = new Set((progRes.data || []).map((p) => p.id as string));
      const seededRows = await fetchAllRows(async (from, to) =>
        admin
          .from('subjects')
          .select('programme_id')
          .eq('publication_status', 'published')
          .order('id')
          .range(from, to)
      );
      const seededProgrammes = new Set(
        seededRows
          .map((row) => row.programme_id as string | null)
          .filter((pid): pid is string => Boolean(pid && programmeIds.has(pid)))
      ).size;

      if (seededProgrammes || subjRes.count || resRes.count) {
        stats = {
          universities: universities.length,
          programmes: seededProgrammes,
          subjects: subjRes.count || 0,
          materials: resRes.count || 0,
        };
      }
    } catch {
      stats = null;
    }

    // The "universities covered" chips must never render empty: if the
    // database is unreachable the section would otherwise show a heading
    // with nothing under it.
    if (universities.length === 0) {
      universities = UNIVERSITY_SCALES.map((scale) => scale.name);
    }
    return { stats, universities };
  },
  ['landing-public-stats-v1'],
  { revalidate: 300, tags: ['taxonomy'] }
);

export default async function RootPage() {
  // Defensive: this is the public, search-indexed page. If the session
  // lookup ever fails, treat the visitor as logged out and still render
  // the landing page rather than erroring.
  let profile: Awaited<ReturnType<typeof getAuthenticatedProfile>> = null;
  try {
    profile = await getAuthenticatedProfile();
  } catch {
    profile = null;
  }
  if (profile) {
    redirect(isStaffRole(profile.role) ? '/admin' : '/dashboard');
  }

  const { stats, universities } = await loadPublicStats();

  // FAQ rich results — the same questions a visitor reads on the page.
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: LANDING_FAQS.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: { '@type': 'Answer', text: faq.a },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        // Server-rendered constant — no user input flows in here.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <LandingPage stats={stats} universities={universities} />
    </>
  );
}
