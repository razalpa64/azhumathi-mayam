import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getAuthenticatedProfile } from '@/lib/auth/session';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { AuthAside } from '@/components/brand/AuthAside';
import { LoginForm } from './LoginForm';

export const metadata = {
  title: 'Log in',
  description: 'Log in to അഴിമതി മയം for your notes, syllabus and question papers.',
};

export default async function LoginPage() {
  const profile = await getAuthenticatedProfile();
  if (profile) {
    redirect(profile.role === 'admin' ? '/admin' : '/dashboard');
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-12 bg-canvas">
      <AuthAside
        headline="Your semester, sorted."
        intro="Notes, syllabi and previous question papers for your course — kept in one place, so you can just sit down and study."
        items={[
          { title: 'Your subjects first', note: 'Set your course and semester once. Everything after that is already filtered for you.' },
          { title: 'Read in the browser', note: 'Open PDFs right here — no downloads needed until you want the file.' },
          { title: 'Papers from past years', note: 'Previous question papers sit beside the notes, subject by subject.' },
        ]}
      />

      {/* Sign-In Form Column */}
      <main className="lg:col-span-7 xl:col-span-7 flex flex-col justify-between px-6 py-8 sm:px-12 lg:px-16">
        <div className="flex items-center justify-between lg:justify-end gap-3">
          <div className="lg:hidden">
            <BrandLogo size="md" subtitle="Academic Portal" />
          </div>
          <span className="text-[13px] text-muted">Student portal</span>
        </div>

        <div className="mx-auto w-full max-w-md py-10">
          <div className="mb-8">
            <h2 className="font-display text-[30px] font-medium leading-tight text-charcoal sm:text-[34px]">
              Welcome back
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Log in with the username you registered with.
            </p>
          </div>

          <Suspense
            fallback={
              <div className="h-64 animate-pulse rounded-xl bg-neutral-soft" />
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
