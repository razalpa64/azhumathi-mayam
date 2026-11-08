import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import '@fontsource-variable/fraunces';
import '@fontsource-variable/baloo-chettan-2';
import { getAuthenticatedProfile, isStaffRole } from '@/lib/auth/session';
import { LoginForm } from './LoginForm';
import { LoginBrandPanel } from './LoginBrandPanel';

export const metadata = {
  title: 'Sign in',
  description: 'Sign in to അഴിമതി മയം for your notes, syllabus and question papers.',
};

export default async function LoginPage() {
  const profile = await getAuthenticatedProfile();
  if (profile) {
    redirect(isStaffRole(profile.role) ? '/admin' : '/dashboard');
  }

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#FFFBF7] lg:flex">
      {/* ── Desktop: brand panel, full height, left ──────────── */}
      <LoginBrandPanel />

      {/* ── Phone / tablet: burgundy wave header ─────────────── */}
      <header className="relative bg-gradient-to-b from-[#330202] via-[#4A0404] to-[#5E0505] lg:hidden">
        {/* soft sheen, top-right like light on silk */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_90%_at_85%_0%,rgba(255,255,255,0.13),transparent_65%)]"
        />
        <div className="relative mx-auto flex max-w-2xl flex-col items-center px-6 pb-36 pt-14 text-center sm:pb-40 sm:pt-20">
          <h1 className="font-logo text-[44px] font-extrabold leading-[1.45] tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.35)] sm:text-6xl sm:leading-[1.4]">
            അഴിമതി
            <br />
            മയം
          </h1>
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/60">
            Learn · Prepare · Excel
          </p>
        </div>

        {/* layered waves — dark ribbon behind, page cream in front */}
        <svg
          aria-hidden="true"
          viewBox="0 0 1440 130"
          preserveAspectRatio="none"
          className="absolute -bottom-px left-0 h-[74px] w-full sm:h-[96px]"
        >
          <path
            d="M0,64 C240,120 420,128 720,84 C1020,40 1200,16 1440,52 L1440,130 L0,130 Z"
            fill="#2A0202"
            opacity="0.55"
          />
          <path
            d="M0,88 C260,130 520,122 820,82 C1100,46 1260,38 1440,72 L1440,130 L0,130 Z"
            fill="#FFFBF7"
          />
        </svg>
      </header>

      {/* ── Sign-in card ───────────────────────────────────────
          Phone: tucked into the wave. Desktop: vertically centred in the
          column beside the brand panel, so the button is always on screen. */}
      <div className="relative lg:flex lg:flex-1 lg:items-center lg:justify-center">
        {/*
          A whisper of warmth behind the card so the cream page is not flat.
          Purely decorative and desktop-only.
        */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 hidden bg-[radial-gradient(55%_50%_at_50%_42%,rgba(121,0,0,0.055),transparent_72%)] lg:block"
        />

        <main className="relative z-10 mx-auto w-full max-w-[430px] px-5 sm:px-0 lg:py-8">
          <section className="relative -mt-24 rounded-[28px] border border-[#F3E2DC] bg-white px-6 pb-7 pt-8 shadow-[0_24px_50px_-20px_rgba(74,4,4,0.35)] sm:-mt-28 sm:px-8 lg:mt-0 lg:rounded-[26px] lg:border-[#EFDAD3] lg:px-9 lg:pb-7 lg:pt-9 lg:shadow-[0_30px_60px_-32px_rgba(74,4,4,0.45)]">
            <h2 className="font-login-display text-center text-[30px] font-semibold leading-tight text-[#43060A]">
              Welcome Back
            </h2>
            <p className="mt-2 text-center text-sm text-[#8A7A74]">
              Sign in to access your academic resources
            </p>

            <div className="mt-7">
              <Suspense
                fallback={
                  <div className="space-y-4" aria-hidden="true">
                    <div className="h-14 animate-pulse rounded-2xl bg-[#F7ECE8]" />
                    <div className="h-14 animate-pulse rounded-2xl bg-[#F7ECE8]" />
                    <div className="h-14 animate-pulse rounded-2xl bg-[#F3D9D2]" />
                  </div>
                }
              >
                <LoginForm />
              </Suspense>
            </div>
          </section>

          <p className="relative pb-40 pt-6 text-center text-xs text-[#A68F86] lg:pb-0 lg:pt-5">
            © {new Date().getFullYear()}{' '}
            <span className="font-logo font-semibold text-[#7A655E]">അഴിമതി മയം</span>
            {' · '}Made for students
          </p>
        </main>
      </div>

      {/* ── Bottom waves (phone / tablet only) ───────────────── */}
      <svg
        aria-hidden="true"
        viewBox="0 0 1440 220"
        preserveAspectRatio="none"
        className="pointer-events-none absolute bottom-0 left-0 h-[150px] w-full sm:h-[190px] lg:hidden"
      >
        <path
          d="M0,110 C240,60 480,40 760,78 C1040,116 1220,140 1440,96 L1440,220 L0,220 Z"
          fill="#F8E9E2"
        />
        <path
          d="M0,150 C260,104 540,92 840,124 C1100,152 1260,168 1440,138 L1440,220 L0,220 Z"
          fill="#F0D8CE"
          opacity="0.8"
        />
        <path
          d="M0,190 C280,150 560,142 860,168 C1120,190 1280,198 1440,178 L1440,220 L0,220 Z"
          fill="#4A0404"
        />
      </svg>
    </div>
  );
}
