import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import '@fontsource-variable/fraunces';
import '@fontsource-variable/baloo-chettan-2';
import { getAuthenticatedProfile } from '@/lib/auth/session';
import { LoginForm } from './LoginForm';

export const metadata = {
  title: 'Sign in',
  description: 'Sign in to അഴിമതി മയം for your notes, syllabus and question papers.',
};

export default async function LoginPage() {
  const profile = await getAuthenticatedProfile();
  if (profile) {
    redirect(profile.role === 'admin' ? '/admin' : '/dashboard');
  }

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#FFFBF7]">
      {/* ── Burgundy header — flat colour, one gentle wave ───── */}
      <header className="relative bg-burgundy-logo">
        <div className="relative mx-auto flex max-w-2xl flex-col items-center px-6 pb-24 pt-11 text-center sm:pt-14">
          <h1 className="font-logo text-white">
            <span className="block text-[21px] font-bold leading-[1.15] sm:text-[25px]">
              അഴിമതി
            </span>
            <span className="block text-[42px] font-extrabold leading-[1.08] sm:text-[54px]">
              മയം
            </span>
          </h1>
        </div>

        <svg
          aria-hidden="true"
          viewBox="0 0 1440 90"
          preserveAspectRatio="none"
          className="absolute -bottom-px left-0 h-[42px] w-full sm:h-[56px]"
        >
          <path
            d="M0,50 C360,88 1080,12 1440,46 L1440,90 L0,90 Z"
            fill="#FFFBF7"
          />
        </svg>
      </header>

      {/* ── Sign-in card, resting lightly on the wave ────────── */}
      <main className="relative z-10 mx-auto w-full max-w-[420px] px-5 sm:px-0">
        <section className="-mt-16 rounded-3xl border border-[#F1E3DD] bg-white px-6 py-7 shadow-[0_12px_32px_-16px_rgba(74,4,4,0.22)] sm:px-8">
          <h2 className="font-login-display text-center text-[26px] font-semibold leading-tight text-[#43060A]">
            Welcome Back
          </h2>
          <p className="mt-1.5 text-center text-sm text-[#8A7A74]">
            Sign in to access your academic resources
          </p>

          <div className="mt-6">
            <Suspense
              fallback={
                <div className="space-y-3.5" aria-hidden="true">
                  <div className="h-12 animate-pulse rounded-xl bg-[#F7ECE8]" />
                  <div className="h-12 animate-pulse rounded-xl bg-[#F7ECE8]" />
                  <div className="h-12 animate-pulse rounded-xl bg-[#F3D9D2]" />
                </div>
              }
            >
              <LoginForm />
            </Suspense>
          </div>
        </section>

        <p className="pb-10 pt-5 text-center text-xs text-[#A68F86]">
          © {new Date().getFullYear()}{' '}
          <span className="font-logo font-semibold text-[#7A655E]">അഴിമതി മയം</span>
          {' · '}Made for students
        </p>
      </main>
    </div>
  );
}
