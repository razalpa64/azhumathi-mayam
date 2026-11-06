import { Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { BookOpen, FileText, GraduationCap, Layers } from 'lucide-react';
import { getAuthenticatedProfile } from '@/lib/auth/session';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { BrandLogo } from '@/components/brand/BrandLogo';
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
  title: 'Create Account',
  description: 'Create a student account on അഴിമതി മയം — Academic Resource & Student Learning Platform.',
};

const REGISTRATION_BENEFITS = [
  {
    icon: GraduationCap,
    title: 'Tailored to Your Degree & Semester',
    description:
      'Pick your university, programme, branch, and current semester once to surface exact syllabus notes immediately.',
  },
  {
    icon: BookOpen,
    title: 'Complete Study Material Library',
    description:
      'Access module-wise lecture notes, lab manuals, syllabi, question banks, and reference documents.',
  },
  {
    icon: FileText,
    title: 'Integrated PDF Reader & Archive',
    description:
      'Preview previous year university question papers right in your browser and bookmark key exam files.',
  },
  {
    icon: Layers,
    title: 'Exam & Syllabus Notifications',
    description:
      'Stay updated with pinned announcements, timetable releases, and newly uploaded subject resources.',
  },
];

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
      {/* Editorial Brand Column */}
      <aside className="hidden lg:flex lg:col-span-5 xl:col-span-5 flex-col justify-between bg-burgundy-deep text-canvas p-10 xl:p-14 border-r border-white/10">
        <div>
          <div className="inline-flex items-center gap-4">
            <div className="relative h-16 w-16 overflow-hidden rounded-lg bg-burgundy-logo ring-1 ring-white/15">
              <Image
                src="/brand/logo.png"
                alt="അഴിമതി മയം"
                width={64}
                height={64}
                className="h-full w-full object-cover"
                priority
              />
            </div>
            <div>
              <h1 className="font-malayalam text-2xl font-bold tracking-tight text-canvas">
                അഴിമതി മയം
              </h1>
              <p className="mt-0.5 text-xs font-medium uppercase tracking-widest text-canvas/65">
                Academic Resource Platform
              </p>
            </div>
          </div>

          <div className="mt-12 border-t border-white/10 pt-10">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-canvas/60">
              Student Registration
            </p>
            <h2 className="mt-3 text-2xl xl:text-3xl font-semibold tracking-tight text-canvas leading-snug">
              Set up your academic workspace in under a minute.
            </h2>
          </div>

          <div className="mt-10 space-y-6">
            {REGISTRATION_BENEFITS.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="flex items-start gap-3.5">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded border border-white/15 bg-burgundy-logo text-canvas">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-canvas">{item.title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-canvas/70">
                      {item.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="pt-10 border-t border-white/10 flex items-center justify-between text-xs text-canvas/55">
          <span className="font-malayalam font-semibold text-canvas/80">അഴിമതി മയം</span>
          <span>Student Academic Portal</span>
        </div>
      </aside>

      {/* Registration Form Column */}
      <main className="lg:col-span-7 xl:col-span-7 flex flex-col justify-between px-6 py-8 sm:px-12 lg:px-16">
        <div className="flex items-center justify-between lg:justify-end gap-3">
          <div className="lg:hidden">
            <BrandLogo size="md" subtitle="Academic Portal" />
          </div>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded border border-line bg-neutral-soft px-3 py-1.5 text-xs font-semibold text-charcoal hover:border-burgundy hover:text-burgundy transition-colors"
          >
            Already registered? Sign In
          </Link>
        </div>

        <div className="mx-auto w-full max-w-xl py-8">
          <div className="mb-6">
            <div className="mb-4 hidden lg:inline-flex items-center gap-2.5 rounded border border-burgundy-border bg-burgundy-tint px-3 py-1 text-xs font-medium text-burgundy">
              <span className="font-malayalam font-bold">അഴിമതി മയം</span>
              <span className="text-burgundy/40">•</span>
              <span>New Student Account</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-charcoal">
              Create your student account
            </h2>
            <p className="mt-1.5 text-sm text-muted leading-relaxed">
              Choose a username and password and select your enrolled programme to personalize your study materials and question paper library.
            </p>
          </div>

          <Suspense
            fallback={
              <div className="h-96 animate-pulse rounded-lg border border-line bg-neutral-soft" />
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
          <span>Academic Resource Platform</span>
        </footer>
      </main>
    </div>
  );
}
