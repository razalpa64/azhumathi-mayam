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
import { Select } from '@/components/ui/Select';
import { SUPPORT_WHATSAPP_URL } from '@/lib/support';
import { branchesForProgramme, programmeHasBranches } from '@/lib/programme-branches';
import { applicableSchemes, keepValidSchemeId } from '@/lib/regulation-scope';
import { semestersForProgramme } from '@/lib/register-options';
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

  const selectedProgramme = useMemo(
    () => programmes.find((programme) => programme.id === programmeId) ?? null,
    [programmes, programmeId]
  );

  // A degree without branches (BBA, BCA, LLB…) never offers one. The flag on
  // the programme decides, so a row filed under the wrong programme cannot
  // leak into this picker.
  const filteredSpecializations = useMemo(
    () => branchesForProgramme(specializations, selectedProgramme),
    [specializations, selectedProgramme]
  );

  // Shown until a programme is picked ("choose programme first"), hidden once
  // we know the course has no branches at all.
  const showBranchField = !programmeId || programmeHasBranches(selectedProgramme);

  const filteredSemesters = useMemo(
    () => semestersForProgramme(semesters, programmeId),
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
            <Select
              id="university"
              value={universityId}
              onChange={handleUniversityChange}
              options={universities.map((u) => ({
                value: u.id,
                label: `${u.short_name} — ${u.name}`,
              }))}
              placeholder="Select your university"
              disabled={loading || universities.length === 0}
              ariaLabel="University"
              emptyLabel="No universities loaded"
            />
            {universities.length === 0 ? (
              <p className="mt-1 flex items-start gap-1.5 text-[11px] font-medium text-burgundy">
                <AlertCircle className="mt-px h-3 w-3 shrink-0" />
                <span>
                  The university list didn’t load, so this form can’t be finished.{' '}
                  <button
                    type="button"
                    onClick={() => router.refresh()}
                    className="underline underline-offset-2 hover:text-burgundy-dark"
                  >
                    Reload the list
                  </button>
                  , or{' '}
                  <a
                    href={SUPPORT_WHATSAPP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-burgundy-dark"
                  >
                    message us on WhatsApp
                  </a>{' '}
                  and we’ll fix it today.
                </span>
              </p>
            ) : (
              <p className="mt-1 text-[11px] text-muted">
                {selectedUniversity
                  ? `Showing ${selectedUniversity.short_name} schemes below.`
                  : 'Pick yours so we show the right scheme.'}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="programme" className="mb-1 block text-xs font-medium text-charcoal">
              Degree Programme
            </label>
            <Select
              id="programme"
              value={programmeId}
              onChange={handleProgrammeChange}
              options={programmes.map((p) => ({ value: p.id, label: p.name }))}
              placeholder="Select Programme"
              disabled={loading || programmes.length === 0}
              ariaLabel="Degree programme"
              emptyLabel="No programmes available"
            />
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
            <Select
              id="semester"
              value={semesterId}
              onChange={setSemesterId}
              options={filteredSemesters.map((sem) => ({ value: sem.id, label: sem.label }))}
              placeholder={programmeId ? 'Select Semester' : 'Choose Programme first'}
              disabled={loading || !programmeId}
              ariaLabel="Current semester"
              emptyLabel={programmeId ? 'No semesters listed' : 'Choose Programme first'}
            />
            {programmeId && filteredSemesters.length === 0 ? (
              <p className="mt-1 text-[11px] text-burgundy">
                No semesters are set up for this programme yet — you can add yours later from your
                profile.
              </p>
            ) : null}
          </div>

          {showBranchField ? (
            <div>
              <label htmlFor="specialization" className="mb-1 block text-xs font-medium text-charcoal">
                Branch / Specialization
              </label>
              <Select
                id="specialization"
                value={specializationId}
                onChange={setSpecializationId}
                options={filteredSpecializations.map((sp) => ({
                  value: sp.id,
                  label: `${sp.code} — ${sp.name}`,
                }))}
                placeholder={
                  !programmeId
                    ? 'Choose Programme first'
                    : filteredSpecializations.length === 0
                      ? 'General / No branch'
                      : 'Select Branch'
                }
                disabled={loading || filteredSpecializations.length === 0}
                ariaLabel="Branch or specialization"
                emptyLabel={!programmeId ? 'Choose Programme first' : 'General / No branch'}
              />
            </div>
          ) : (
            // Nothing to ask: BBA, BCA, LLB and friends are a single course.
            // Say so, instead of silently removing a field the student may
            // have been told to expect.
            <p className="text-[11px] leading-relaxed text-muted">
              {selectedProgramme?.name} has no branches — nothing to pick here.
            </p>
          )}

          <div>
            <label htmlFor="regulation" className="mb-1 block text-xs font-medium text-charcoal">
              Regulation / Scheme
            </label>
            <Select
              id="regulation"
              value={regulationId}
              onChange={setRegulationId}
              options={schemeOptions.map(({ reg, label }) => ({ value: reg.id, label }))}
              placeholder={
                !universityId
                  ? 'Choose your university first'
                  : filteredRegulations.length === 0
                    ? 'No scheme listed for this course yet'
                    : 'Select Scheme (Optional)'
              }
              disabled={loading || !universityId || filteredRegulations.length === 0}
              ariaLabel="Regulation or scheme"
              emptyLabel={
                !universityId ? 'Choose your university first' : 'No scheme listed yet'
              }
            />
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
            {universityId && filteredRegulations.length === 0 ? (
              <p className="mt-1 text-[11px] text-burgundy">
                No scheme is listed for this selection yet — you can set it later from your profile.
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
