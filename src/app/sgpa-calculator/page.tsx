import type { Metadata } from 'next';
import Link from 'next/link';
import { SgpaCalculatorClient } from '@/components/calculator/SgpaCalculatorClient';
import { UNIVERSITY_SCALES } from '@/lib/university-grades';
import { getSiteUrl } from '@/lib/site';
import { getAuthenticatedProfile, isStaffRole } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { StudentShell } from '@/components/student/StudentShell';

const description =
  'Free SGPA & CGPA calculator for KTU, Calicut University, MG University, University of Kerala, Kannur University and CUSAT students. Pick your university, enter grades, and get SGPA, CGPA and the official percentage conversion instantly — no sign-up.';

export const metadata: Metadata = {
  title: 'SGPA & CGPA Calculator — KTU, Calicut, MG, Kerala, Kannur, CUSAT',
  description,
  alternates: { canonical: '/sgpa-calculator' },
  openGraph: {
    title: 'SGPA & CGPA Calculator for Kerala Universities | Azhumathi Mayam',
    description,
    url: '/sgpa-calculator',
    type: 'website',
  },
};

const FAQS: { q: string; a: string }[] = [
  {
    q: 'How is SGPA calculated?',
    a: 'SGPA = sum of (subject credits × grade points) divided by the total credits in the semester. Choose your university first — each one assigns different points to the same letter grade (for example, an A is worth 8.5 at KTU but 8 at Calicut University).',
  },
  {
    q: 'How do I convert CGPA to percentage?',
    a: 'It depends on your university. KTU, Calicut, Kerala and Kannur Universities use Percentage = CGPA × 10, while MG University and CUSAT use Percentage = (CGPA − 0.5) × 10. The calculator applies your university’s official formula automatically and shows it next to the result.',
  },
  {
    q: 'How is CGPA calculated from semester SGPAs?',
    a: 'CGPA is the credit-weighted average of all semester SGPAs: sum of (semester credits × SGPA) divided by sum of semester credits. Use the "SGPA → CGPA" mode and enter each completed semester.',
  },
  {
    q: 'Does this calculator work for my university?',
    a: 'It covers APJ Abdul Kalam Technological University (KTU), University of Calicut, Mahatma Gandhi University, University of Kerala, Kannur University and CUSAT, using each university’s published grade scale. If a grade’s points don’t match your grade card, trust your card — regulations change between batches.',
  },
];

export default async function SgpaCalculatorPage() {
  const siteUrl = getSiteUrl();

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
  const appJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'SGPA & CGPA Calculator — KTU, Calicut, MG, Kerala, Kannur, CUSAT',
    url: `${siteUrl}/sgpa-calculator`,
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Web',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
    description,
  };

  // The calculator is a nav item inside the app, so a signed-in student
  // must stay inside the app shell — leaving the shell here meant the
  // bottom bar and tab strip vanished the moment you opened the
  // calculator. Logged-out visitors (and staff) still get the
  // standalone, search-indexed marketing page.
  const profile = await getAuthenticatedProfile().catch(() => null);
  const insideApp = Boolean(profile && !isStaffRole(profile.role));

  let unreadNotifications = 0;
  if (insideApp && profile) {
    const supabase = await createSupabaseServerClient();
    const { count } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', profile.id)
      .eq('is_read', false);
    unreadNotifications = count || 0;
  }

  const calculatorBody = (
    <>
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold tracking-[0.18em] text-burgundy uppercase">
            Free tool · No sign-up
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">
            SGPA &amp; CGPA Calculator
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-pretty text-neutral-600 sm:text-base">
            For KTU, Calicut, MG, Kerala, Kannur and CUSAT students. Pick your university, enter
            your grades, and get your SGPA, CGPA and percentage — calculated with your
            university&rsquo;s official grade scale.
          </p>
        </div>

        <div className="mx-auto mt-8 max-w-2xl">
          <SgpaCalculatorClient />
        </div>

        {/* Grade scales */}
        <section className="mx-auto mt-14 max-w-3xl">
          <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">
            Grade points &amp; percentage formulas by university
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-neutral-600">
            Every university assigns its own points and conversion formula. These are the scales
            used above, straight from each university&rsquo;s regulations.
          </p>
          <div className="mt-5 space-y-4">
            {UNIVERSITY_SCALES.map((s) => (
              <div key={s.id} className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-neutral-100 px-4 py-3 sm:px-5">
                  <h3 className="text-sm font-bold text-neutral-900">
                    {s.shortName} <span className="font-medium text-neutral-500">· {s.system}</span>
                  </h3>
                  <span className="rounded-full bg-burgundy-tint px-2.5 py-1 text-xs font-bold text-burgundy">
                    % = {s.formulaLabel}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[420px] text-left text-sm">
                    <thead>
                      <tr className="text-xs tracking-wide text-neutral-500 uppercase">
                        <th className="px-4 py-2.5 font-semibold sm:px-5">Grade</th>
                        <th className="px-4 py-2.5 font-semibold">Points</th>
                        <th className="px-4 py-2.5 font-semibold">Marks</th>
                        <th className="px-4 py-2.5 font-semibold">Meaning</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.grades.map((g) => (
                        <tr key={g.label} className="border-t border-neutral-100">
                          <td className="px-4 py-2 font-bold text-neutral-900 sm:px-5">{g.label}</td>
                          <td className="px-4 py-2 font-semibold text-burgundy tabular-nums">{g.points}</td>
                          <td className="px-4 py-2 text-neutral-600 tabular-nums">{g.range || '—'}</td>
                          <td className="px-4 py-2 text-neutral-600">{g.meaning || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="border-t border-neutral-100 px-4 py-3 text-xs leading-relaxed text-neutral-600 sm:px-5">
                  {s.formulaNote}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto mt-14 max-w-3xl">
          <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">
            Frequently asked questions
          </h2>
          <div className="mt-5 space-y-3">
            {FAQS.map((f) => (
              <details key={f.q} className="rounded-2xl border border-neutral-200 bg-white px-4 py-3.5 sm:px-5">
                <summary className="cursor-pointer text-sm font-bold text-neutral-900">{f.q}</summary>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto mt-14 max-w-3xl rounded-3xl bg-burgundy px-5 py-8 text-center sm:px-10">
          <h2 className="text-xl font-extrabold text-white text-balance sm:text-2xl">
            Notes and question papers for your subjects
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-white/80">
            Azhumathi Mayam carries study materials, previous question papers and important
            questions for students across Kerala&rsquo;s universities — free.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              href="/register"
              className="inline-flex min-h-11 items-center rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-burgundy shadow-sm transition hover:bg-burgundy-tint"
            >
              Create free account
            </Link>
            <Link
              href="/"
              className="inline-flex min-h-11 items-center rounded-xl border border-white/40 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-white/10"
            >
              Explore the platform
            </Link>
          </div>
        </section>
    </>
  );

  const page = (
    <div
      className={
        insideApp
          ? 'text-neutral-900 antialiased'
          : 'min-h-screen bg-[#FFFDFC] text-neutral-900 antialiased'
      }
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(appJsonLd) }} />

      {/* Header — the app shell already has a header and tab strip */}
      {insideApp ? null : (
      <header className="border-b border-neutral-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-3.5 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Azhumathi Mayam home">
            <img src="/icon.svg" alt="" className="h-9 w-9 shrink-0" />
            <span className="text-base font-extrabold tracking-tight text-burgundy sm:text-lg">
              Azhumathi Mayam
            </span>
          </Link>
          <Link
            href="/"
            className="ml-auto text-sm font-semibold text-burgundy underline-offset-4 hover:underline"
          >
            Home
          </Link>
        </div>
      </header>
      )}

      {/* Inside the app the shell already provides the <main> landmark —
          nesting a second one confuses screen readers. */}
      {insideApp ? (
        <div className="w-full max-w-5xl">
          {calculatorBody}
        </div>
      ) : (
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        {calculatorBody}
      </main>
      )}
      {insideApp ? null : (
      <footer className="border-t border-neutral-100 bg-white">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-3 px-4 py-6 text-center sm:px-6">
          <p className="text-sm font-bold text-burgundy">Azhumathi Mayam</p>
          <nav className="flex flex-wrap justify-center gap-x-5 gap-y-1 text-sm text-neutral-600">
            <Link href="/" className="hover:text-burgundy">Home</Link>
            <Link href="/login" className="hover:text-burgundy">Sign in</Link>
            <Link href="/register" className="hover:text-burgundy">Create account</Link>
          </nav>
          <p className="text-xs text-neutral-500">
            Free SGPA/CGPA calculator for KTU, Calicut, MG, Kerala, Kannur and CUSAT students.
            Results are indicative — your university result is final.
          </p>
        </div>
      </footer>
      )}
    </div>
  );

  if (insideApp && profile) {
    return (
      <StudentShell profile={profile} unreadNotifications={unreadNotifications}>
        {page}
      </StudentShell>
    );
  }

  return page;
}
