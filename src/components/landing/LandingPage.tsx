import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  Bell,
  BookOpen,
  CalendarDays,
  Download,
  FileQuestion,
  GraduationCap,
  Layers,
} from 'lucide-react';

export type LandingStats = {
  universities: number;
  programmes: number;
  subjects: number;
  materials: number;
};

const FEATURES = [
  {
    icon: BookOpen,
    title: 'Notes & study materials',
    text: 'Module-wise study notes and materials for your exact subjects — no hunting through random drives and Telegram forwards.',
  },
  {
    icon: FileQuestion,
    title: 'Previous question papers',
    text: 'Previous year university question papers to practise with, sorted by course, subject and semester.',
  },
  {
    icon: Layers,
    title: 'Syllabus, semester-wise',
    text: 'Your syllabus broken down by semester and subject, so you always know what to study next.',
  },
  {
    icon: CalendarDays,
    title: 'Study planner & exam countdown',
    text: 'Set your exam date and get a day-by-day study plan that covers every subject before the exam.',
  },
  {
    icon: Bell,
    title: 'Alerts for new uploads',
    text: 'Get notified the moment new notes or question papers are added for your course.',
  },
  {
    icon: Download,
    title: 'Works offline',
    text: 'Install Azhimathi Mayam as an app and keep your materials one tap away, even without internet.',
  },
];

const FAQS = [
  {
    q: 'Where can I download KTU previous year question papers?',
    a: 'Create a free Azhimathi Mayam account, choose your KTU course, branch and semester, and the previous year question papers for your subjects appear right on your dashboard — along with notes and syllabus for the same subjects.',
  },
  {
    q: 'Is Azhimathi Mayam free for students?',
    a: 'Yes. Study notes, previous question papers, syllabus PDFs, the study planner and exam countdown are all free for students. You only need an account so the materials match your course and semester.',
  },
  {
    q: 'Which universities and courses are covered?',
    a: 'Azhimathi Mayam covers Kerala universities including KTU (APJ Abdul Kalam Technological University) and the University of Calicut — B.Tech, B.Sc, B.Com, BBA, BCA, BA and more — with materials organised by programme, branch and semester, including the Calicut FYUGP scheme.',
  },
  {
    q: 'How are the study materials organised?',
    a: 'Everything follows your academic path: university → programme → branch → semester → subject. Pick your course once during sign-up and your dashboard only shows what is relevant to you.',
  },
];

export function LandingPage({
  stats,
  universities,
}: {
  stats: LandingStats | null;
  universities: string[];
}) {
  return (
    <div className="min-h-dvh bg-canvas text-charcoal">
      {/* ── Header ─────────────────────────────────────────── */}
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
            <span className="block font-logo text-lg font-bold text-burgundy-deep">
              അഴിമതി മയം
            </span>
            <span className="block text-[10px] font-bold uppercase tracking-[0.22em] text-muted">
              Azhimathi Mayam
            </span>
          </span>
        </Link>
        <nav className="flex items-center gap-2 sm:gap-3" aria-label="Account">
          <Link
            href="/sgpa-calculator"
            className="hidden rounded-full px-4 py-2 text-sm font-semibold text-burgundy transition-colors hover:bg-burgundy-tint min-[420px]:block"
          >
            SGPA Calculator
          </Link>
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

      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="bg-burgundy text-white">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/75">
            For Kerala university students
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-extrabold leading-[1.12] tracking-tight sm:text-5xl">
            Study notes, question papers &amp; syllabus — ready before your
            exam.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/85 sm:text-lg">
            Azhimathi Mayam (അഴിമതി മയം) organises study notes, previous year
            question papers and syllabus PDFs by your course, branch and
            semester — covering KTU, the University of Calicut and more. Stop
            searching a hundred places for one note.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-burgundy shadow-[0_14px_28px_-12px_rgba(0,0,0,0.6)] transition-all hover:bg-burgundy-tint active:scale-95"
            >
              Get your notes — it&apos;s free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white ring-1 ring-white/40 transition-colors hover:bg-white/10"
            >
              I already have an account
            </Link>
          </div>

          {stats ? (
            <dl className="mt-12 grid grid-cols-2 gap-6 border-t border-white/15 pt-8 sm:grid-cols-4">
              {[
                [stats.universities, 'Universities'],
                [stats.programmes, 'Programmes'],
                [stats.subjects, 'Subjects'],
                [stats.materials, 'Study materials'],
              ].map(([value, label]) => (
                <div key={label as string} className="flex flex-col">
                  <dt className="order-2 mt-1 block text-xs font-medium text-white/70">
                    {label}
                  </dt>
                  <dd className="text-3xl font-extrabold tabular-nums">
                    {Number(value).toLocaleString('en-IN')}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-16">
        <h2 className="text-2xl font-bold tracking-tight text-charcoal sm:text-3xl">
          Everything you need for exam revision, in one place
        </h2>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">
          Last-minute revision notes, important questions, previous papers and
          a study plan that tells you what to read today — built for how
          students actually prepare.
        </p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <article
                key={feature.title}
                className="rounded-[20px] bg-white p-6 shadow-[0_20px_40px_-28px_rgba(36,7,7,0.35)] ring-1 ring-burgundy/[0.06]"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-burgundy-tint text-burgundy">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-[15px] font-semibold text-charcoal">
                  {feature.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">
                  {feature.text}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      {/* ── Coverage ───────────────────────────────────────── */}
      <section className="border-y border-line bg-white">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-burgundy-tint text-burgundy">
              <GraduationCap className="h-5 w-5" />
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-charcoal">
              Universities &amp; courses covered
            </h2>
          </div>
          {universities.length > 0 ? (
            <ul className="mt-6 flex flex-wrap gap-2">
              {universities.map((name) => (
                <li
                  key={name}
                  className="rounded-full bg-burgundy-tint px-4 py-2 text-[13px] font-semibold text-burgundy"
                >
                  {name}
                </li>
              ))}
            </ul>
          ) : null}
          <p className="mt-6 max-w-3xl text-[15px] leading-relaxed text-muted">
            Popular with students right now: KTU B.Tech notes and previous year
            question papers for the 2024 and 2019 schemes, University of
            Calicut FYUGP study materials for B.Sc, B.Com, BBA, BCA and BA
            programmes, semester-wise syllabus PDFs, important questions and
            quick revision notes before exams.
          </p>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        <h2 className="text-2xl font-bold tracking-tight text-charcoal">
          Start studying in under a minute
        </h2>
        <ol className="mt-8 grid gap-5 sm:grid-cols-3">
          {[
            [
              '1',
              'Create your free account',
              'Sign up and pick your university, course, branch and semester.',
            ],
            [
              '2',
              'Open your dashboard',
              'Your subjects, notes, question papers and syllabus are already arranged for you.',
            ],
            [
              '3',
              'Revise and download',
              'Download materials, set an exam date and follow your study plan.',
            ],
          ].map(([step, title, text]) => (
            <li
              key={step}
              className="rounded-[20px] bg-white p-6 shadow-[0_20px_40px_-28px_rgba(36,7,7,0.35)] ring-1 ring-burgundy/[0.06]"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-burgundy text-sm font-bold text-white">
                {step}
              </span>
              <h3 className="mt-4 text-[15px] font-semibold text-charcoal">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ── FAQ ────────────────────────────────────────────── */}
      <section className="border-t border-line bg-white">
        <div className="mx-auto max-w-4xl px-5 py-14 sm:px-8">
          <h2 className="text-2xl font-bold tracking-tight text-charcoal">
            Questions students ask
          </h2>
          <div className="mt-8 space-y-3">
            {FAQS.map((faq) => (
              <details
                key={faq.q}
                className="group rounded-2xl bg-canvas p-5 ring-1 ring-burgundy/[0.06]"
              >
                <summary className="cursor-pointer list-none text-[15px] font-semibold text-charcoal marker:hidden">
                  {faq.q}
                </summary>
                <p className="mt-2.5 text-sm leading-relaxed text-muted">{faq.a}</p>
              </details>
            ))}
          </div>
          <div className="mt-10 rounded-[24px] bg-burgundy p-8 text-center text-white">
            <h2 className="text-xl font-bold sm:text-2xl">
              Your next exam is closer than you think.
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-white/85">
              Join Azhimathi Mayam and get the notes, question papers and study
              plan for your semester — free.
            </p>
            <Link
              href="/register"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-burgundy transition-all hover:bg-burgundy-tint active:scale-95"
            >
              Create free account
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-10 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p>
          <span className="font-logo font-bold text-burgundy-deep">അഴിമതി മയം</span>{' '}
          — study notes, question papers &amp; syllabus for Kerala students.
        </p>
        <p>
          Help:{' '}
          <a
            href="mailto:help.azhimathimayam@gmail.com"
            className="font-medium text-burgundy hover:underline"
          >
            help.azhimathimayam@gmail.com
          </a>{' '}
          · 86061 59002 ·{' '}
          <Link href="/sgpa-calculator" className="font-medium text-burgundy hover:underline">
            KTU SGPA Calculator
          </Link>
        </p>
      </footer>
    </div>
  );
}
