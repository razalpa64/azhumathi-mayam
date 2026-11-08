'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { applicableSchemes, keepValidSchemeId } from '@/lib/regulation-scope';
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

  // Schemes follow the university the student picked: nothing is offered
  // until one is chosen, KTU gets its own 2019/2024 schemes and never the
  // Kerala common ones, and the degree level trims the rest. The rule and
  // the reasoning behind it live in src/lib/regulation-scope.ts — the
  // profile editor uses the same function, so the two pickers cannot drift.
  const filteredRegulations = useMemo(
    () => applicableSchemes({ regulations, programmes, universityId, programmeId }),
    [regulations, programmes, universityId, programmeId]
  );

  const selectedUniversity = universities.find((u) => u.id === universityId);
  const ownSchemes = filteredRegulations.filter(
    (r) => r.university_id && r.university_id === universityId
  );

  // A scheme chosen before the university/programme changed may no longer
  // be on offer — drop it, and take the only option when there is just one
  // so the student is never left with an empty answer we already know.
  useEffect(() => {
    setRegulationId((previous) => {
      const kept = keepValidSchemeId(previous, filteredRegulations);
      if (kept) return kept;
      return filteredRegulations.length === 1 ? filteredRegulations[0].id : '';
    });
  }, [filteredRegulations]);

  // One flat, short list. Native Android renders <optgroup> headings as
  // full-size rows and wraps any long label onto two lines, which turned
  // this picker into an unreadable block — so the grouping is carried by
  // a short prefix instead, and the batch range moves out of the option
  // into the caption underneath.
  const SCHEME_SHORT_LABELS: Record<string, string> = {
    'KTU-2024': '2024 scheme',
    'KTU-2019': '2019 scheme',
    'FYUGP-2024': 'FYUGP 2024',
    'CBCSS-UG': 'CBCSS UG',
    'CSS-PG': 'CSS (PG)',
  };
  const schemeOptions = filteredRegulations.map((reg) => {
    const short = SCHEME_SHORT_LABELS[reg.code] || reg.name;
    const prefix = reg.university_id
      ? (universities.find((u) => u.id === reg.university_id)?.short_name ?? 'Own')
      : 'Common';
    return { reg, label: `${prefix} · ${short}` };
  });
  const selectedScheme = filteredRegulations.find((r) => r.id === regulationId);

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
    // The scheme list is derived from this value; the effect above prunes
    // or pre-selects the scheme to match.
    setUniversityId(nextUniId);
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

      // A shared deep link (a forwarded material, a subject) must survive
      // sign-up too, not just sign-in.
      const safeNext =
        nextParam &&
        (nextParam.startsWith('/dashboard') || nextParam.startsWith('/resources')) &&
        !nextParam.startsWith('//')
          ? nextParam
          : null;

      if (data.requiresManualLogin) {
        router.replace(
          `/login?registered=1${safeNext ? `&next=${encodeURIComponent(safeNext)}` : ''}`
        );
        return;
      }

      router.replace(safeNext || data.redirectTo || '/dashboard');
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label
            htmlFor="full_name"
            className="block text-xs font-semibold uppercase tracking-wider text-charcoal"
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
              className="h-11 w-full rounded-md border border-line-strong bg-canvas pl-10 pr-3.5 text-sm text-charcoal placeholder:text-muted/75 focus:border-burgundy focus:outline-none focus:ring-2 focus:ring-burgundy/15 disabled:opacity-60"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="username"
            className="block text-xs font-semibold uppercase tracking-wider text-charcoal"
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
              className="h-11 w-full rounded-md border border-line-strong bg-canvas pl-10 pr-3.5 text-sm text-charcoal placeholder:text-muted/75 focus:border-burgundy focus:outline-none focus:ring-2 focus:ring-burgundy/15 disabled:opacity-60"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label
            htmlFor="password"
            className="block text-xs font-semibold uppercase tracking-wider text-charcoal"
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
              className="h-11 w-full rounded-md border border-line-strong bg-canvas pl-10 pr-10 text-sm text-charcoal placeholder:text-muted/75 focus:border-burgundy focus:outline-none focus:ring-2 focus:ring-burgundy/15 disabled:opacity-60"
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
            className="block text-xs font-semibold uppercase tracking-wider text-charcoal"
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
              className="h-11 w-full rounded-md border border-line-strong bg-canvas pl-10 pr-3.5 text-sm text-charcoal placeholder:text-muted/75 focus:border-burgundy focus:outline-none focus:ring-2 focus:ring-burgundy/15 disabled:opacity-60"
            />
          </div>
        </div>
      </div>

      {/* Academic Personalization Box */}
      <div className="rounded-lg border border-line bg-neutral-soft p-4 space-y-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-burgundy" />
            <span className="text-xs font-semibold uppercase tracking-wider text-charcoal">
              Your course
            </span>
          </div>
          <span className="text-[11px] text-muted">You can change this later</span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="university" className="mb-1 block text-xs font-medium text-charcoal">
              University
            </label>
            <select
              id="university"
              value={universityId}
              onChange={(e) => handleUniversityChange(e.target.value)}
              disabled={loading}
              className="h-10 w-full rounded-md border border-line-strong bg-canvas px-3 text-sm text-charcoal focus:border-burgundy focus:outline-none"
            >
              <option value="">Select your university</option>
              {universities.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.short_name} — {u.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-muted">
              {selectedUniversity
                ? `Showing ${selectedUniversity.short_name} schemes below.`
                : 'Pick yours so we show the right scheme.'}
            </p>
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
              className="h-10 w-full rounded-md border border-line-strong bg-canvas px-3 text-sm text-charcoal focus:border-burgundy focus:outline-none"
            >
              <option value="">Select Programme</option>
              {programmes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {programmes.length === 0 ? (
              <p className="mt-1 text-[11px] font-medium text-burgundy">
                No programmes are set up yet, so registration cannot finish. Please message us on
                WhatsApp and we will fix it.
              </p>
            ) : null}
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
              className="h-10 w-full rounded-md border border-line-strong bg-canvas px-3 text-sm text-charcoal focus:border-burgundy focus:outline-none disabled:opacity-55"
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
              className="h-10 w-full rounded-md border border-line-strong bg-canvas px-3 text-sm text-charcoal focus:border-burgundy focus:outline-none disabled:opacity-55"
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
              disabled={loading || !universityId || filteredRegulations.length === 0}
              className="h-10 w-full rounded-md border border-line-strong bg-canvas px-3 text-sm text-charcoal focus:border-burgundy focus:outline-none disabled:opacity-55"
            >
              <option value="">
                {!universityId
                  ? 'Choose your university first'
                  : filteredRegulations.length === 0
                    ? 'No scheme listed for this course yet'
                    : 'Select Scheme (Optional)'}
              </option>
              {schemeOptions.map(({ reg, label }) => (
                <option key={reg.id} value={reg.id}>
                  {label}
                </option>
              ))}
            </select>
            {selectedScheme?.batch_range ? (
              <p className="mt-1 text-[11px] text-muted">
                {selectedScheme.name} · Admissions: {selectedScheme.batch_range}
              </p>
            ) : null}
            {!universityId ? (
              <p className="mt-1 text-[11px] text-muted">
                Pick your university and only its schemes appear here.
              </p>
            ) : null}
            {universityId && ownSchemes.length === 0 && filteredRegulations.length > 0 ? (
              <p className="mt-1 text-[11px] text-muted">
                No {selectedUniversity?.short_name}-only scheme yet — these are the shared Kerala
                regulations. Pick the one on your grade card.
              </p>
            ) : null}
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
          Sign in here
        </Link>
      </p>
    </form>
  );
}
