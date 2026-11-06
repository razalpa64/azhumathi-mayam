'use client';

import { useState } from 'react';
import Link from 'next/link';
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
  UserPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

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
  const [error, setError] = useState<string | null>(
    reason === 'deactivated'
      ? 'This account has been paused. Please talk to your administrator.'
      : null
  );

  const registerHref =
    nextParam &&
    (nextParam.startsWith('/dashboard') || nextParam.startsWith('/resources')) &&
    !nextParam.startsWith('//')
      ? `/register?next=${encodeURIComponent(nextParam)}`
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

      if (
        data.role === 'student' &&
        nextParam &&
        (nextParam.startsWith('/dashboard') || nextParam.startsWith('/resources')) &&
        !nextParam.startsWith('//')
      ) {
        router.replace(nextParam);
      } else {
        router.replace(data.redirectTo || '/dashboard');
      }
      router.refresh();
    } catch {
      setError('Couldn’t reach the server. Check your connection and try again.');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {registered && !error ? (
        <div
          role="status"
          className="flex items-start gap-3 rounded-md border border-[#BBF7D0] bg-[#F0FDF4] px-3.5 py-3 text-sm text-[#166534]"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Account created. Log in below to get started.</span>
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-md border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-3 text-sm text-[#991B1B]"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="space-y-1.5">
        <label
          htmlFor="username"
          className="block text-[13px] font-semibold text-charcoal"
        >
          Username
        </label>
        <div className="relative">
          <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
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
            placeholder="e.g. anjali.cs"
            className="h-11.5 w-full rounded-lg border border-line-strong bg-paper pl-10 pr-3.5 text-sm text-charcoal placeholder:text-muted/60 focus:border-burgundy focus:outline-none focus:ring-4 focus:ring-burgundy/10 disabled:opacity-60"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="password"
          className="block text-[13px] font-semibold text-charcoal"
        >
          Password
        </label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            placeholder="Your password"
            className="h-11.5 w-full rounded-lg border border-line-strong bg-paper pl-10 pr-11 text-sm text-charcoal placeholder:text-muted/60 focus:border-burgundy focus:outline-none focus:ring-4 focus:ring-burgundy/10 disabled:opacity-60"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted hover:bg-neutral-soft hover:text-charcoal focus:outline-none focus-visible:ring-2 focus-visible:ring-burgundy cursor-pointer"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between pt-0.5">
        <label className="inline-flex items-center gap-2.5 text-sm text-charcoal cursor-pointer select-none">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-4 w-4 rounded border-line-strong accent-burgundy focus:ring-burgundy"
          />
          <span>Stay signed in on this device</span>
        </label>
      </div>

      <Button
        type="submit"
        size="lg"
        disabled={loading}
        className="w-full justify-center font-semibold"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Logging in…</span>
          </>
        ) : (
          <>
            <span>Log in</span>
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </Button>

      <div className="relative py-1">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-line" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-canvas px-3 font-medium text-muted">New here?</span>
        </div>
      </div>

      <Link
        href={registerHref}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-line-strong bg-paper px-4 text-sm font-semibold text-charcoal transition-colors hover:border-burgundy hover:text-burgundy focus:outline-none focus-visible:ring-2 focus-visible:ring-burgundy"
      >
        <UserPlus className="h-4 w-4" />
        <span>Create an account — it takes a minute</span>
      </Link>
    </form>
  );
}
