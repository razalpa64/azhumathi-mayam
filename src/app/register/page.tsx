import { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAuthenticatedProfile } from '@/lib/auth/session';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { AuthAside } from '@/components/brand/AuthAside';
import { RegisterForm } from './RegisterForm';
import type {
  AcademicRegulation,
  Programme,
  Semester,
  Specialization,
  University,
} from '@/types/database';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Create your account',
  description: 'Create a student account on അഴിമതി മയം — set your course and semester, and your notes are ready.',
};

export default async function RegisterPage() {
  const profile = await getAuthenticatedProfile();
  if (profile) {
    redirect(profile.role === 'admin' ? '/admin' : '/dashboard');
  }

  const adminClient = createSupabaseAdminClient();
  const [
    { data: universities },
    { data: programmes },
    { data: specializations },
    { data: regulations },
    { data: semesters },
  ] = await Promise.all([
    adminClient
      .from('universities')
      .select('*')
      .eq('is_active', true)
      .order('display_order')
      .order('name'),
    adminClient
      .from('programmes')
      .select('*')
      .eq('is_active', true)
      .order('display_order')
      .order('name'),
    adminClient
      .from('specializations')
      .select('*')
      .eq('is_active', true)
      .order('display_order')
      .order('name'),
    adminClient
      .from('academic_regulations')
      .select('*')
      .eq('is_active', true)
      .order('display_order')
      .order('name'),
    adminClient
      .from('semesters')
      .select('*')
      .eq('is_active', true)
      .order('semester_number'),
  ]);

  return (
    <div className="min-h-screen grid lg:grid-cols-12 bg-canvas">
      <AuthAside
        headline="Start with your course."
        intro="Tell us what you’re studying and which semester you’re in. From then on, അഴിമതി മയം shows your subjects and their materials first."
        items={[
          { title: 'Pick your course', note: 'University, programme, branch, semester. That’s the personalisation done.' },
          { title: 'Find things fast', note: 'Search by subject code or topic, and save what matters for exams.' },
          { title: 'Hear about new uploads', note: 'Notices and new materials for your semester land in one feed.' },
        ]}
      />

      {/* Registration Form Column */}
      <main className="lg:col-span-7 xl:col-span-7 flex flex-col justify-between px-6 py-8 sm:px-12 lg:px-16">
        <div className="flex items-center justify-between lg:justify-end gap-3">
          <div className="lg:hidden">
            <BrandLogo size="md" subtitle="Academic Portal" />
          </div>
          <Link
            href="/login"
            className="text-[13.5px] font-medium text-muted hover:text-burgundy"
          >
            Already have an account? Log in
          </Link>
        </div>

        <div className="mx-auto w-full max-w-xl py-8">
          <div className="mb-7">
            <h2 className="font-display text-[30px] font-medium leading-tight text-charcoal sm:text-[34px]">
              Create your account
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              A username, a password, and your course — that’s all it takes.
            </p>
          </div>

          <Suspense
            fallback={
              <div className="h-96 animate-pulse rounded-xl bg-neutral-soft" />
            }
          >
            <RegisterForm
              universities={(universities || []) as University[]}
              programmes={(programmes || []) as Programme[]}
              specializations={(specializations || []) as Specialization[]}
              regulations={(regulations || []) as AcademicRegulation[]}
              semesters={(semesters || []) as Semester[]}
            />
          </Suspense>
        </div>

        <footer className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-line pt-5 text-xs text-muted">
          <span>
            © {new Date().getFullYear()}{' '}
            <span className="font-malayalam font-semibold text-charcoal">അഴിമതി മയം</span>. All
            rights reserved.
          </span>
          <span>അഴിമതി മയം</span>
        </footer>
      </main>
    </div>
  );
}
