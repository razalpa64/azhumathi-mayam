import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getAuthenticatedProfile, isStaffRole } from '@/lib/auth/session';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { LandingPage, type LandingStats } from '@/components/landing/LandingPage';
import { SITE_DESCRIPTION } from '@/lib/site';

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

export default async function RootPage() {
  const profile = await getAuthenticatedProfile();
  if (profile) {
    redirect(isStaffRole(profile.role) ? '/admin' : '/dashboard');
  }

  // Public, search-facing stats. Best-effort: if the database is
  // unreachable the landing page simply renders without the numbers.
  let stats: LandingStats | null = null;
  let universities: string[] = [];
  try {
    const admin = createSupabaseAdminClient();
    const [uniRes, progRes, subjRes, resRes] = await Promise.all([
      admin.from('universities').select('name').order('name'),
      admin.from('programmes').select('id', { count: 'exact', head: true }),
      admin.from('subjects').select('id', { count: 'exact', head: true }),
      admin
        .from('resources')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'published'),
    ]);
    universities = (uniRes.data || []).map((u) => u.name as string).filter(Boolean);
    if (progRes.count || subjRes.count || resRes.count) {
      stats = {
        universities: universities.length,
        programmes: progRes.count || 0,
        subjects: subjRes.count || 0,
        materials: resRes.count || 0,
      };
    }
  } catch {
    stats = null;
  }

  return <LandingPage stats={stats} universities={universities} />;
}
