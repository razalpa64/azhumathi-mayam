import { Suspense } from 'react';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { BookOpen, FileText, GraduationCap, Layers } from 'lucide-react';
import { getAuthenticatedProfile } from '@/lib/auth/session';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { LoginForm } from './LoginForm';

export const metadata = {
  title: 'Sign in',
  description: 'Sign in to അഴിമതി മയം for your notes, syllabus and question papers.',
};

const PLATFORM_PILLARS = [
  {
    icon: GraduationCap,
    title: 'Set up for your semester',
    description:
      'Your programme, branch and semester are set once. After that, your subjects and notes are just there.',
  },
  {
    icon: BookOpen,
    title: 'Notes, kept in order',
    description:
      'Lecture notes, lab manuals and reference books, arranged module by module.',
  },
  {
    icon: FileText,
    title: 'Past question papers',
    description:
      'Open previous years’ university papers right in your browser — no downloading first.',
  },
  {
    icon: Layers,
    title: 'Notices that matter',
    description:
      'Exam timetables, syllabus changes and deadlines, in one feed.',
  },
];

export default async function LoginPage() {
  const profile = await getAuthenticatedProfile();
  if (profile) {
    redirect(profile.role === 'admin' ? '/admin' : '/dashboard');
  }

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
              Notes · Syllabus · Question Papers
            </p>
            <h2 className="mt-3 text-2xl xl:text-3xl font-semibold tracking-tight text-canvas leading-snug">
              Your course notes and question papers, in one place.
            </h2>
          </div>

          <div className="mt-10 space-y-6">
            {PLATFORM_PILLARS.map((item) => {
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
          <span>Student portal</span>
        </div>
      </aside>

      {/* Sign-In Form Column */}
      <main className="lg:col-span-7 xl:col-span-7 flex flex-col justify-between px-6 py-8 sm:px-12 lg:px-16">
        <div className="flex items-center justify-between lg:justify-end gap-3">
          <div className="lg:hidden">
            <BrandLogo size="md" subtitle="Student portal" />
          </div>
          <span className="inline-flex items-center gap-2 rounded border border-line bg-neutral-soft px-2.5 py-1 text-xs font-medium text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-burgundy" />
            Student Learning Portal
          </span>
        </div>

        <div className="mx-auto w-full max-w-md py-10">
          <div className="mb-8">
            <div className="mb-5 hidden lg:inline-flex items-center gap-2.5 rounded border border-burgundy-border bg-burgundy-tint px-3 py-1 text-xs font-medium text-burgundy">
              <span className="font-malayalam font-bold">അഴിമതി മയം</span>
              <span className="text-burgundy/40">•</span>
              <span>Student sign-in</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-charcoal">
              Welcome back
            </h2>
            <p className="mt-2 text-sm text-muted leading-relaxed">
              Sign in with your username to see your subjects, notes and question papers. New here? Create an account below.
            </p>
          </div>

          <Suspense
            fallback={
              <div className="h-64 animate-pulse rounded-lg border border-line bg-neutral-soft" />
            }
          >
            <LoginForm />
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
