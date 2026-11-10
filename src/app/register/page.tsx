import { Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { BookOpen, FileText, GraduationCap, Layers } from 'lucide-react';
import { getAuthenticatedProfile, isStaffRole } from '@/lib/auth/session';
import { unstable_cache } from 'next/cache';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { TAXONOMY_CACHE_TAG } from '@/lib/taxonomy';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { InvytraCredit } from '@/components/InvytraCredit';
import { programmesWithSemesters } from '@/lib/register-options';
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

const REGISTRATION_BENEFITS = [
  {
    icon: GraduationCap,
    title: 'Your degree, your semester',
    description:
      'Tell us your university, programme, branch and semester once — your notes show up on their own after that.',
  },
  {
    icon: BookOpen,
    title: 'The full library',
    description:
      'Module-wise notes, lab manuals, syllabi and question banks for your subjects.',
  },
  {
    icon: FileText,
    title: 'Read papers in the browser',
    description:
      'Read previous years’ question papers here, and save the important ones for exam week.',
  },
  {
    icon: Layers,
    title: 'Exam news, on time',
    description:
      'Timetables, announcements and new uploads for your semester, as they happen.',
  },
];

/*
  The sign-up pickers.

  This deliberately does NOT read the `subjects` table. It used to, in
  order to hide programmes with no materials yet — but that tied a
  registration form to a paged scan of ~2,000 rows, and whenever the scan
  came back empty (a failed page, a cold database, a cached short read) the
  programme picker emptied out and, with it, the semester, branch and
  scheme pickers that depend on the chosen programme. Not being able to
  register is a far worse outcome than landing on a quiet dashboard, so
  sign-up now offers the whole active taxonomy and nothing else.

  A programme is offered only if it has at least one semester, because the
  semester picker is filled from those rows; if none qualify, everything is
  offered rather than an empty list.

  Cached across requests for five minutes — it changes only when staff
  edit the taxonomy, and it is identical for every visitor.
*/
interface RegistrationTaxonomy {
  universities: University[];
  programmes: Programme[];
  specializations: Specialization[];
  regulations: AcademicRegulation[];
  semesters: Semester[];
}

const EMPTY_TAXONOMY: RegistrationTaxonomy = {
  universities: [],
  programmes: [],
  specializations: [],
  regulations: [],
  semesters: [],
};

/**
 * One read of the whole taxonomy.
 *
 * Returns null when any of the five queries failed. That matters: a failed
 * read used to come back as "no rows" and get stored by unstable_cache, which
 * then served an empty University picker to every visitor for five minutes —
 * a form that cannot be completed, from one blip. Nothing partial is ever
 * returned, so nothing partial is ever cached.
 */
async function readTaxonomy(): Promise<RegistrationTaxonomy | null> {
  const admin = createSupabaseAdminClient();
  const [programmesRes, universitiesRes, specializationsRes, regulationsRes, semestersRes] =
    await Promise.all([
      admin.from('programmes').select('*').eq('is_active', true).order('display_order').order('name'),
      admin.from('universities').select('*').eq('is_active', true).order('display_order').order('name'),
      admin.from('specializations').select('*').eq('is_active', true).order('display_order').order('name'),
      admin.from('academic_regulations').select('*').eq('is_active', true).order('display_order').order('name'),
      admin.from('semesters').select('*').eq('is_active', true).order('semester_number'),
    ]);

  const failed = [
    ['programmes', programmesRes.error],
    ['universities', universitiesRes.error],
    ['specializations', specializationsRes.error],
    ['regulations', regulationsRes.error],
    ['semesters', semestersRes.error],
  ].filter(([, error]) => Boolean(error));

  if (failed.length > 0) {
    console.warn(
      `[register] taxonomy read failed (${failed.map(([name]) => name).join(', ')}) — not caching this`
    );
    return null;
  }

  let programmes = (programmesRes.data || []) as Programme[];
  let universities = (universitiesRes.data || []) as University[];
  let semesterRows = (semestersRes.data || []) as Semester[];

  // Everything switched off is far more likely a bad flag than a site with no
  // degrees (or no universities) — retry unfiltered rather than show a form
  // whose first picker has nothing in it and a student who cannot sign up.
  if (programmes.length === 0) {
    const { data: allProgrammes } = await admin
      .from('programmes')
      .select('*')
      .order('display_order')
      .order('name');
    programmes = (allProgrammes || []) as Programme[];
    console.warn(
      `[register] no active programmes — offering ${programmes.length} unfiltered instead`
    );
  }

  if (universities.length === 0) {
    const { data: allUniversities } = await admin
      .from('universities')
      .select('*')
      .order('display_order')
      .order('name');
    universities = (allUniversities || []) as University[];
    console.warn(
      `[register] no active universities — offering ${universities.length} unfiltered instead`
    );
  }

  if (semesterRows.length === 0) {
    const { data: allSemesters } = await admin
      .from('semesters')
      .select('*')
      .order('semester_number');
    semesterRows = (allSemesters || []) as Semester[];
  }

  // Only programmes whose semester picker can actually be filled — the rest of
  // the form hangs off that choice. See programmesWithSemesters().
  const usableProgrammes = programmesWithSemesters(programmes, semesterRows);

  return {
    universities,
    programmes: usableProgrammes,
    specializations: (specializationsRes.data || []) as Specialization[],
    regulations: (regulationsRes.data || []) as AcademicRegulation[],
    semesters: semesterRows,
  };
}

const loadTaxonomy = unstable_cache(
  async () => {
    const taxonomy = await readTaxonomy();
    // Throwing keeps a broken read out of the cache; the page below falls back
    // to a live read for this request instead.
    if (!taxonomy) throw new Error('[register] taxonomy unavailable');
    return taxonomy;
  },
  // v5: drops any entry v4 may already hold from before a taxonomy migration
  // (e.g. a degree or a set of branches added straight in SQL) — a bump is the
  // only way to evict a cached copy that no admin write has invalidated, and
  // 0027 (BBA: Finance / Marketing / HRM) is exactly such a migration.
  ['register-taxonomy-v5'],
  { revalidate: 300, tags: [TAXONOMY_CACHE_TAG] }
);

async function getTaxonomy(): Promise<RegistrationTaxonomy> {
  try {
    return await loadTaxonomy();
  } catch {
    return (await readTaxonomy()) ?? EMPTY_TAXONOMY;
  }
}

export default async function RegisterPage() {
  const profile = await getAuthenticatedProfile();
  if (profile) {
    redirect(isStaffRole(profile.role) ? '/admin' : '/dashboard');
  }

  const { universities, programmes, specializations, regulations, semesters } = await getTaxonomy();

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
                Student study portal
              </p>
            </div>
          </div>

          <div className="mt-12 border-t border-white/10 pt-10">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-canvas/60">
              New student account
            </p>
            <h2 className="mt-3 text-2xl xl:text-3xl font-semibold tracking-tight text-canvas leading-snug">
              Set up in about a minute.
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
          <span>അഴിമതി മയം</span>
        </div>
      </aside>

      {/* Registration Form Column */}
      <main className="lg:col-span-7 xl:col-span-7 flex flex-col justify-between px-6 py-8 sm:px-12 lg:px-16">
        <div className="flex items-center justify-between lg:justify-end gap-3">
          <div className="lg:hidden">
            <BrandLogo size="md" subtitle="Student portal" />
          </div>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded border border-line bg-neutral-soft px-3 py-1.5 text-xs font-semibold text-charcoal hover:border-burgundy hover:text-burgundy transition-colors"
          >
            Already have an account? Sign in
          </Link>
        </div>

        <div className="mx-auto w-full max-w-xl py-8">
          <div className="mb-6">
            <div className="mb-4 hidden lg:inline-flex items-center gap-2.5 rounded border border-burgundy-border bg-burgundy-tint px-3 py-1 text-xs font-medium text-burgundy">
              <span className="font-malayalam font-bold">അഴിമതി മയം</span>
              <span className="text-burgundy/40">•</span>
              <span>New account</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-charcoal">
              Create your account
            </h2>
            <p className="mt-1.5 text-sm text-muted leading-relaxed">
              Pick a username and password, then tell us your programme and semester so we can show your materials first.
            </p>
          </div>

          <Suspense
            fallback={
              <div className="h-96 animate-pulse rounded-lg border border-line bg-neutral-soft" />
            }
          >
            <RegisterForm
              universities={universities}
              programmes={programmes}
              specializations={specializations}
              regulations={regulations}
              semesters={semesters}
            />
          </Suspense>
        </div>

        <footer className="border-t border-line pt-5 text-xs text-muted">
          <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
            <span>
              © {new Date().getFullYear()}{' '}
              <span className="font-malayalam font-semibold text-charcoal">അഴിമതി മയം</span>. All
              rights reserved.
            </span>
            <span>Student study portal</span>
          </div>
          <div className="mt-3 flex justify-center sm:justify-end">
            <InvytraCredit />
          </div>
        </footer>
      </main>
    </div>
  );
}
