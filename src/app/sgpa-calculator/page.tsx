import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { SgpaCalculatorClient } from '@/components/calculator/SgpaCalculatorClient';
import { KTU_GRADES } from '@/lib/ktu-grades';

export const metadata: Metadata = {
  title: {
    absolute: 'KTU SGPA & CGPA Calculator — 2019 & 2024 Scheme | Azhimathi Mayam',
  },
  description:
    'Free KTU SGPA and CGPA calculator for APJ Abdul Kalam Technological University B.Tech students (2019 & 2024 schemes). Enter subject credits and grades to get your SGPA, CGPA and percentage (CGPA × 10).',
  keywords: [
    'KTU SGPA calculator',
    'KTU CGPA calculator',
    'KTU percentage conversion',
    'APJ Abdul Kalam Technological University CGPA',
    'KTU grade points',
  ],
  alternates: { canonical: '/sgpa-calculator' },
  openGraph: {
    type: 'website',
    url: '/sgpa-calculator',
    title: 'KTU SGPA & CGPA Calculator | Azhimathi Mayam',
    description:
      'Calculate your KTU SGPA and CGPA in seconds — 2019 & 2024 schemes, with percentage conversion.',
  },
};

const FAQS = [
  {
    q: 'How is KTU SGPA calculated?',
    a: 'SGPA = Σ (subject credits × grade point) ÷ Σ (subject credits) for that semester. Multiply each subject’s credits by its grade point (S/O = 10, A+ = 9, A = 8.5, B+ = 8, B = 7.5, C+ = 7, C = 6.5, D = 6, P = 5.5, F = 0), add them up, and divide by the total credits.',
  },
  {
    q: 'How do I convert KTU CGPA to percentage?',
    a: 'Percentage = CGPA × 10. This is KTU’s current official conversion (Academic Council decision, June 2023) for both the 2019 and 2024 schemes. An older formula, (CGPA × 10) − 3.75, appears on some older documents.',
  },
  {
    q: 'What is the difference between the 2019 and 2024 scheme grades?',
    a: 'The grade points are the same half-step scale. The main label change: the 2024 scheme calls the top grade “O” (Outstanding, 10 points) where the 2019 scheme calls it “S”. This calculator lists it as O / S.',
  },
  {
    q: 'Does an F grade count in SGPA?',
    a: 'Yes — an F carries 0 grade points but its credits still count in the denominator, which is why one back paper pulls the SGPA down. You must clear it to earn those credits.',
  },
];

export default function SgpaCalculatorPage() {
  return (
    <div className="min-h-dvh bg-canvas text-charcoal">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="relative h-10 w-10 overflow-hidden rounded-xl ring-1 ring-burgundy-border">
            <Image
              src="/brand/logo.png"
              alt="Azhimathi Mayam logo"
              width={40}
              height={40}
              className="h-full w-full object-cover"
            />
          </span>
          <span className="leading-tight">
            <span className="block font-logo text-lg font-bold text-burgundy-deep">അഴിമതി മയം</span>
            <span className="block text-[10px] font-bold uppercase tracking-[0.22em] text-muted">
              Azhimathi Mayam
            </span>
          </span>
        </Link>
        <nav className="flex items-center gap-2 sm:gap-3" aria-label="Account">
          <Link
            href="/login"
            className="rounded-full px-4 py-2 text-sm font-semibold text-burgundy transition-colors hover:bg-burgundy-tint"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="rounded-full bg-burgundy px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_20px_-10px_rgba(121,0,0,0.8)] transition-all hover:bg-burgundy-dark active:scale-95"
          >
            Create free account
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-16 sm:px-8">
        <div className="max-w-3xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-burgundy">
            KTU · APJ Abdul Kalam Technological University
          </p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-charcoal sm:text-4xl">
            KTU SGPA &amp; CGPA Calculator
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">
            Enter your subject credits and grades — get your SGPA instantly, then
            combine semesters into a CGPA with percentage. Works for the 2019 and
            2024 schemes, and your numbers stay saved on this device for next time.
          </p>
        </div>

        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1fr_320px]">
          <SgpaCalculatorClient />

          <aside className="rounded-[24px] bg-white p-6 shadow-[0_24px_45px_-30px_rgba(36,7,7,0.35)] ring-1 ring-burgundy/[0.06]">
            <h2 className="text-[15px] font-semibold text-charcoal">KTU grade points</h2>
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-muted">
                  <th className="pb-2 font-bold">Grade</th>
                  <th className="pb-2 font-bold">Points</th>
                  <th className="pb-2 text-right font-bold">Marks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {KTU_GRADES.map((g) => (
                  <tr key={g.label}>
                    <td className="py-2 font-mono font-semibold text-charcoal">{g.label}</td>
                    <td className="py-2 tabular-nums text-muted">{g.points}</td>
                    <td className="py-2 text-right text-muted">{g.range}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-5 rounded-2xl bg-burgundy-tint p-4">
              <p className="text-[13px] font-semibold text-charcoal">Preparing for next semester?</p>
              <p className="mt-1 text-[13px] leading-relaxed text-muted">
                Get free KTU notes, previous question papers and a study plan for
                your branch and semester.
              </p>
              <Link
                href="/register"
                className="mt-3 inline-flex rounded-full bg-burgundy px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-burgundy-dark"
              >
                Join Azhimathi Mayam — free
              </Link>
            </div>
          </aside>
        </div>

        <section className="mx-auto mt-14 max-w-4xl">
          <h2 className="text-2xl font-bold tracking-tight text-charcoal">
            How KTU calculates SGPA &amp; CGPA
          </h2>
          <div className="mt-4 space-y-3 text-[15px] leading-relaxed text-muted">
            <p>
              <strong className="text-charcoal">SGPA</strong> is the credit-weighted
              average of one semester: Σ (credits × grade point) ÷ total credits.{' '}
              <strong className="text-charcoal">CGPA</strong> is the same weighted
              average across every semester you have completed — weight each
              semester’s SGPA by that semester’s total credits (a plain average of
              SGPAs is wrong whenever semesters carry different credit loads).
            </p>
            <p>
              Convert to percentage with <strong className="text-charcoal">CGPA × 10</strong>,
              KTU’s current official formula (Academic Council, June 2023).
            </p>
          </div>

          <h2 className="mt-10 text-2xl font-bold tracking-tight text-charcoal">
            Frequently asked questions
          </h2>
          <div className="mt-6 space-y-3">
            {FAQS.map((faq) => (
              <details
                key={faq.q}
                className="group rounded-2xl bg-white p-5 ring-1 ring-burgundy/[0.06]"
              >
                <summary className="cursor-pointer list-none text-[15px] font-semibold text-charcoal marker:hidden">
                  {faq.q}
                </summary>
                <p className="mt-2.5 text-sm leading-relaxed text-muted">{faq.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>
            <span className="font-logo font-bold text-burgundy-deep">അഴിമതി മയം</span> —
            free notes &amp; question papers for Kerala students.
          </p>
          <p className="flex gap-4">
            <Link href="/" className="font-medium text-burgundy hover:underline">Home</Link>
            <Link href="/register" className="font-medium text-burgundy hover:underline">Register</Link>
            <Link href="/login" className="font-medium text-burgundy hover:underline">Sign in</Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
