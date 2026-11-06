'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  GraduationCap,
  Loader2,
  Lock,
  User,
  UserCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type {
  AcademicRegulation,
  Programme,
  Semester,
  Specialization,
  University,
} from '@/types/database';

interface RegisterFormProps {
  universities: University[];
  programmes: Programme[];
  specializations: Specialization[];
  regulations: AcademicRegulation[];
  semesters: Semester[];
}

export function RegisterForm({
  universities,
  programmes,
  specializations,
  regulations,
  semesters,
}: RegisterFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get('next');

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [universityId, setUniversityId] = useState('');
  const [programmeId, setProgrammeId] = useState('');
  const [specializationId, setSpecializationId] = useState('');
  const [semesterId, setSemesterId] = useState('');
  const [regulationId, setRegulationId] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredSpecializations = useMemo(
    () =>
      programmeId
        ? specializations.filter((s) => s.programme_id === programmeId)
        : [],
    [specializations, programmeId]
  );

  const filteredSemesters = useMemo(
    () =>
      programmeId
        ? semesters.filter((s) => s.programme_id === programmeId)
        : [],
    [semesters, programmeId]
  );

  const filteredRegulations = useMemo(
    () =>
      universityId
        ? regulations.filter((r) => !r.university_id || r.university_id === universityId)
        : regulations,
    [regulations, universityId]
  );

  const loginHref =
    nextParam &&
    (nextParam.startsWith('/dashboard') || nextParam.startsWith('/resources')) &&
    !nextParam.startsWith('//')
      ? `/login?next=${encodeURIComponent(nextParam)}`
      : '/login';

  function handleProgrammeChange(nextProgId: string) {
    setProgrammeId(nextProgId);
    setSpecializationId('');
    setSemesterId('');
  }

  function handleUniversityChange(nextUniId: string) {
    setUniversityId(nextUniId);
    setRegulationId('');
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const trimmedName = fullName.trim();
    const trimmedUser = username.trim().toLowerCase();

    if (trimmedName.length < 2) {
      setError('Please enter your full name.');
      return;
    }
    if (trimmedUser.length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          full_name: trimmedName,
          username: trimmedUser,
          password,
          confirmPassword,
          university_id: universityId || null,
          programme_id: programmeId || null,
          specialization_id: specializationId || null,
          semester_id: semesterId || null,
          regulation_id: regulationId || null,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Could not create your account. Please check your details.');
        setLoading(false);
        return;
      }

      if (data.requiresManualLogin) {
        router.replace('/login?registered=1');
        return;
      }

      if (
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
      setError('Network error while creating your account. Please try again.');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {error ? (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-md border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-3 text-sm text-[#991B1B]"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label
            htmlFor="full_name"
            className="block text-[13px] font-semibold text-charcoal"
          >
            Your name <span className="text-burgundy">*</span>
          </label>
          <div className="relative">
            <UserCheck className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              id="full_name"
              name="full_name"
              type="text"
              autoComplete="name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={loading}
              placeholder="e.g. Arjun Nair"
              className="h-11.5 w-full rounded-lg border border-line-strong bg-paper pl-10 pr-3.5 text-sm text-charcoal placeholder:text-muted/60 focus:border-burgundy focus:outline-none focus:ring-4 focus:ring-burgundy/10 disabled:opacity-60"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="username"
            className="block text-[13px] font-semibold text-charcoal"
          >
            Username <span className="text-burgundy">*</span>
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
              placeholder="e.g. arjun_cs26"
              className="h-11.5 w-full rounded-lg border border-line-strong bg-paper pl-10 pr-3.5 text-sm text-charcoal placeholder:text-muted/60 focus:border-burgundy focus:outline-none focus:ring-4 focus:ring-burgundy/10 disabled:opacity-60"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label
            htmlFor="password"
            className="block text-[13px] font-semibold text-charcoal"
          >
            Password <span className="text-burgundy">*</span>
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              placeholder="Min. 8 characters"
              className="h-11.5 w-full rounded-lg border border-line-strong bg-paper pl-10 pr-10 text-sm text-charcoal placeholder:text-muted/60 focus:border-burgundy focus:outline-none focus:ring-4 focus:ring-burgundy/10 disabled:opacity-60"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted hover:bg-neutral-soft hover:text-charcoal cursor-pointer"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="confirmPassword"
            className="block text-[13px] font-semibold text-charcoal"
          >
            Password, again <span className="text-burgundy">*</span>
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              placeholder="Same password again"
              className="h-11.5 w-full rounded-lg border border-line-strong bg-paper pl-10 pr-3.5 text-sm text-charcoal placeholder:text-muted/60 focus:border-burgundy focus:outline-none focus:ring-4 focus:ring-burgundy/10 disabled:opacity-60"
            />
          </div>
        </div>
      </div>

      {/* Academic Personalization Box */}
      <div className="space-y-3.5 border-t border-line pt-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-burgundy" />
            <span className="text-[13px] font-semibold text-charcoal">
              Your course
            </span>
          </div>
          <span className="text-[11px] text-muted">You can change this later</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="university" className="mb-1 block text-xs font-medium text-charcoal">
              University
            </label>
            <select
              id="university"
              value={universityId}
              onChange={(e) => handleUniversityChange(e.target.value)}
              disabled={loading}
              className="h-10.5 w-full rounded-lg border border-line-strong bg-paper px-3 text-sm text-charcoal focus:border-burgundy focus:outline-none focus:ring-4 focus:ring-burgundy/10"
            >
              <option value="">Select University (Optional)</option>
              {universities.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.short_name} — {u.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="programme" className="mb-1 block text-xs font-medium text-charcoal">
              Degree Programme
            </label>
            <select
              id="programme"
              value={programmeId}
              onChange={(e) => handleProgrammeChange(e.target.value)}
              disabled={loading}
              className="h-10.5 w-full rounded-lg border border-line-strong bg-paper px-3 text-sm text-charcoal focus:border-burgundy focus:outline-none focus:ring-4 focus:ring-burgundy/10"
            >
              <option value="">Select Programme</option>
              {programmes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="semester" className="mb-1 block text-xs font-medium text-charcoal">
              Current Semester
            </label>
            <select
              id="semester"
              value={semesterId}
              onChange={(e) => setSemesterId(e.target.value)}
              disabled={loading || !programmeId}
              className="h-10.5 w-full rounded-lg border border-line-strong bg-paper px-3 text-sm text-charcoal focus:border-burgundy focus:outline-none focus:ring-4 focus:ring-burgundy/10 disabled:opacity-55"
            >
              <option value="">
                {programmeId ? 'Select Semester' : 'Choose Programme first'}
              </option>
              {filteredSemesters.map((sem) => (
                <option key={sem.id} value={sem.id}>
                  {sem.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="specialization" className="mb-1 block text-xs font-medium text-charcoal">
              Branch / Specialization
            </label>
            <select
              id="specialization"
              value={specializationId}
              onChange={(e) => setSpecializationId(e.target.value)}
              disabled={loading || filteredSpecializations.length === 0}
              className="h-10.5 w-full rounded-lg border border-line-strong bg-paper px-3 text-sm text-charcoal focus:border-burgundy focus:outline-none focus:ring-4 focus:ring-burgundy/10 disabled:opacity-55"
            >
              <option value="">
                {!programmeId
                  ? 'Choose Programme first'
                  : filteredSpecializations.length === 0
                    ? 'General / No branch'
                    : 'Select Branch'}
              </option>
              {filteredSpecializations.map((sp) => (
                <option key={sp.id} value={sp.id}>
                  {sp.code} — {sp.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="regulation" className="mb-1 block text-xs font-medium text-charcoal">
              Regulation / Scheme
            </label>
            <select
              id="regulation"
              value={regulationId}
              onChange={(e) => setRegulationId(e.target.value)}
              disabled={loading}
              className="h-10.5 w-full rounded-lg border border-line-strong bg-paper px-3 text-sm text-charcoal focus:border-burgundy focus:outline-none focus:ring-4 focus:ring-burgundy/10"
            >
              <option value="">Select Scheme (Optional)</option>
              {filteredRegulations.map((reg) => (
                <option key={reg.id} value={reg.id}>
                  {reg.name}
                </option>
              ))}
            </select>
          </div>
        </div>
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
            <span>Creating your account…</span>
          </>
        ) : (
          <>
            <span>Create my account</span>
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </Button>

      <p className="text-center text-sm text-muted">
        Already have an account?{' '}
        <Link
          href={loginHref}
          className="font-semibold text-burgundy hover:text-burgundy-dark underline-offset-4 hover:underline"
        >
          Log in
        </Link>
      </p>
    </form>
  );
}
