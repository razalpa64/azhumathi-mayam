'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SUPPORT_PHONE_DISPLAY, SUPPORT_WHATSAPP_URL } from '@/lib/support';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Eye,
  EyeOff,
  Lock,
  User,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
} from 'lucide-react';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason');
  const registered = searchParams.get('registered') === '1';
  const nextParam = searchParams.get('next');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showForgotHelp, setShowForgotHelp] = useState(false);
  const [error, setError] = useState<string | null>(
    reason === 'deactivated'
      ? 'This account has been paused. Please check with your college office.'
      : null
  );

  // Where the middleware bounced them from. Only these shapes are honoured —
  // anything else (absolute URLs, protocol-relative paths) is ignored, so
  // `?next=` can never be used to send someone off-site after signing in.
  const nextPath = nextParam || '';
  const isSafeNext = !nextPath.startsWith('//');
  const isStudentPath =
    isSafeNext && (nextPath.startsWith('/dashboard') || nextPath.startsWith('/resources'));
  const isAdminPath =
    isSafeNext && (nextPath === '/admin' || nextPath.startsWith('/admin/'));

  const registerHref = isStudentPath
    ? `/register?next=${encodeURIComponent(nextPath)}`
    : '/register';

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const trimmedUser = username.trim();
    if (!trimmedUser) {
      setError('Enter your username.');
      return;
    }
    if (!password) {
      setError('Enter your password.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          username: trimmedUser,
          password,
          remember,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'That username and password don’t match. Try again.');
        setLoading(false);
        return;
      }

      // Staff dropped mid-task by an expired session return to the exact admin
      // page they were on, instead of being dumped on the console home.
      const backTo =
        data.role === 'student' && isStudentPath
          ? nextPath
          : (data.role === 'admin' || data.role === 'sub_admin') && isAdminPath
            ? nextPath
            : null;

      router.replace(backTo || data.redirectTo || '/dashboard');
      router.refresh();
    } catch {
      setError('Couldn’t reach the server. Check your connection and try again.');
      setLoading(false);
    }
  }

  const inputClass =
    'h-14 w-full rounded-2xl border border-[#EBD9D3] bg-[#FFFBF8] pl-12 pr-4 text-[15px] text-charcoal placeholder:text-[#B29A91] transition-colors focus:border-burgundy focus:bg-white focus:outline-none focus:ring-4 focus:ring-burgundy/10 disabled:opacity-60';

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {registered && !error ? (
        <div
          role="status"
          className="flex items-start gap-3 rounded-2xl border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-3 text-sm text-[#166534]"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Account created — sign in below.</span>
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#991B1B]"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <div>
        <label htmlFor="username" className="sr-only">
          Username
        </label>
        <div className="relative">
          <User
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-burgundy"
            strokeWidth={1.9}
          />
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
            placeholder="Username"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="password" className="sr-only">
          Password
        </label>
        <div className="relative">
          <Lock
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-burgundy"
            strokeWidth={1.9}
          />
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            placeholder="Password"
            className={`${inputClass} pr-12`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-[#B29A91] transition-colors hover:text-burgundy focus:outline-none focus-visible:ring-2 focus-visible:ring-burgundy cursor-pointer"
          >
            {showPassword ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between px-0.5 pt-0.5">
        <label className="inline-flex cursor-pointer select-none items-center gap-2.5 text-sm text-charcoal">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-5 w-5 rounded-md border-[#D8BDB4] accent-burgundy focus:ring-burgundy"
          />
          <span>Remember me</span>
        </label>
        <button
          type="button"
          onClick={() => setShowForgotHelp((prev) => !prev)}
          aria-expanded={showForgotHelp}
          className="text-sm font-medium text-burgundy hover:underline underline-offset-4 cursor-pointer"
        >
          Forgot password?
        </button>
      </div>

      {showForgotHelp ? (
        <div
          role="status"
          className="rounded-2xl bg-burgundy-tint px-4 py-3 text-[13px] leading-relaxed text-charcoal"
        >
          <p>
            Forgot your password? Message us on WhatsApp with your username — we&apos;ll reset it
            for you.
          </p>
          <a
            href={`${SUPPORT_WHATSAPP_URL}?text=${encodeURIComponent(
              'Hi Azhimathi Mayam, I forgot my password. My username is: '
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 font-semibold text-burgundy hover:underline underline-offset-4"
          >
            WhatsApp {SUPPORT_PHONE_DISPLAY}
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-b from-[#6D0000] to-[#4A0404] text-base font-semibold text-white shadow-[0_12px_24px_-10px_rgba(74,4,4,0.55)] transition-all hover:brightness-125 focus:outline-none focus-visible:ring-2 focus-visible:ring-burgundy focus-visible:ring-offset-2 active:scale-[0.99] disabled:opacity-60 cursor-pointer"
      >
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Logging in…</span>
          </>
        ) : (
          <>
            <span>Login</span>
            <ArrowRight className="h-5 w-5" />
          </>
        )}
      </button>

      <div className="relative py-2">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-[#F0E0D9]" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-white px-3 font-medium text-[#A68F86]">New to <span className="font-logo font-semibold">അഴിമതി മയം</span>?</span>
        </div>
      </div>

      <Link
        href={registerHref}
        className="flex h-12.5 w-full items-center justify-center rounded-2xl border-[1.5px] border-burgundy/25 bg-burgundy-tint/60 px-4 text-[15px] font-semibold text-burgundy transition-colors hover:border-burgundy hover:bg-burgundy hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-burgundy"
      >
        Create new account
      </Link>

      {/* The brand already fills the desktop side panel; dropping this line
          there is what keeps the whole card above the fold on a short laptop. */}
      <p className="flex items-center justify-center gap-2 pt-3 text-[13px] text-[#8A7A74] lg:hidden">
        <ShieldCheck className="h-4.5 w-4.5 shrink-0 text-burgundy" />
        <span className="font-logo font-bold text-burgundy">അഴിമതി മയം</span>
        <span aria-hidden="true" className="text-[#D8BDB4]">•</span>
        <span>Learn. Prepare. Excel.</span>
      </p>
    </form>
  );
}
