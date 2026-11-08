'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, CheckCircle2, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { applicableSchemes, keepValidSchemeId } from '@/lib/regulation-scope';
import { Badge } from '@/components/ui/Badge';
import type {
  AcademicRegulation,
  Profile,
  Programme,
  Semester,
  Specialization,
  University,
} from '@/types/database';
import { formatDate, getInitials } from '@/lib/utils';

interface ProfileEditorClientProps {
  profile: Profile;
  universities: University[];
  programmes: Programme[];
  specializations: Specialization[];
  regulations: AcademicRegulation[];
  semesters: Semester[];
}

export function ProfileEditorClient({
  profile,
  universities,
  programmes,
  specializations,
  regulations,
  semesters,
}: ProfileEditorClientProps) {
  const router = useRouter();

  const [fullName, setFullName] = useState(profile.full_name);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url);
  const [universityId, setUniversityId] = useState(profile.university_id || '');
  const [programmeId, setProgrammeId] = useState(profile.programme_id || '');
  const [specializationId, setSpecializationId] = useState(profile.specialization_id || '');
  const [regulationId, setRegulationId] = useState(profile.regulation_id || '');
  const [semesterId, setSemesterId] = useState(profile.semester_id || '');

  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const availableSpecializations = useMemo(
    () => specializations.filter((s) => s.programme_id === programmeId),
    [programmeId, specializations]
  );

  const availableSemesters = useMemo(
    () => semesters.filter((s) => s.programme_id === programmeId),
    [programmeId, semesters]
  );

  // Same rule as sign-up (src/lib/regulation-scope.ts): only the schemes
  // this university actually runs. Whatever the student is already on is
  // always kept in the list, so opening this page never blanks a stored
  // value — it is pruned only when they change university or programme.
  const availableRegulations = useMemo(() => {
    const options = applicableSchemes({ regulations, programmes, universityId, programmeId });
    const current = regulations.find((r) => r.id === regulationId);
    if (current && !options.some((option) => option.id === current.id)) {
      return [...options, current];
    }
    return options;
  }, [regulations, programmes, universityId, programmeId, regulationId]);

  function handleUniversityChange(nextUniversityId: string) {
    setUniversityId(nextUniversityId);
    setRegulationId((previous) =>
      keepValidSchemeId(
        previous,
        applicableSchemes({ regulations, programmes, universityId: nextUniversityId, programmeId })
      )
    );
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await fetch('/api/student/avatar', {
        method: 'POST',
        credentials: 'same-origin',
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Avatar upload failed.' });
      } else {
        setAvatarUrl(data.avatarUrl);
        setMessage({ type: 'success', text: 'Profile picture updated.' });
        router.refresh();
      }
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/student/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          full_name: fullName,
          university_id: universityId || null,
          programme_id: programmeId || null,
          specialization_id:
            programmeId && availableSpecializations.length > 0 ? specializationId || null : null,
          regulation_id: regulationId || null,
          semester_id: programmeId ? semesterId || null : null,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Could not update profile.' });
      } else {
        setMessage({
          type: 'success',
          text: 'Saved. Your dashboard now matches your new selection.',
        });
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
      {/* Summary Card */}
      <aside className="lg:col-span-4 space-y-4">
        <div className="rounded-xl border border-line bg-canvas p-6 space-y-5 lg:rounded-[26px] lg:p-7">
          <div className="flex items-center gap-4">
            <div className="relative">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt={fullName}
                  className="h-16 w-16 rounded-full object-cover border border-line-strong"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-burgundy text-lg font-bold text-canvas">
                  {getInitials(fullName || profile.username)}
                </div>
              )}
              <label
                htmlFor="avatar-upload"
                title="Change profile photo"
                className="absolute -bottom-1 -right-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-line-strong bg-canvas text-charcoal hover:bg-neutral-soft"
              >
                {uploadingAvatar ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-burgundy" />
                ) : (
                  <Camera className="h-3.5 w-3.5 text-burgundy" />
                )}
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleAvatarChange}
                  disabled={uploadingAvatar}
                  className="sr-only"
                />
              </label>
            </div>

            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-charcoal">{fullName}</h2>
              <p className="font-mono text-xs text-muted">@{profile.username}</p>
              <div className="mt-1.5">
                <Badge variant="burgundy">Authenticated Student</Badge>
              </div>
            </div>
          </div>

          <dl className="divide-y divide-line border-t border-line pt-3 text-xs">
            <div className="flex justify-between py-2.5">
              <dt className="text-muted">Username</dt>
              <dd className="font-mono font-medium text-charcoal">{profile.username}</dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-muted">Account Created</dt>
              <dd className="font-mono text-charcoal">{formatDate(profile.created_at)}</dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-muted">Account Status</dt>
              <dd className="font-medium text-[#166534]">Active</dd>
            </div>
          </dl>
        </div>
      </aside>

      {/* Editable Form */}
      <form
        onSubmit={handleSubmit}
        className="lg:col-span-8 rounded-xl border border-line bg-canvas p-6 sm:p-8 space-y-6 lg:rounded-[26px]"
      >
        <div>
          <h2 className="text-lg font-semibold text-charcoal">About you</h2>
          <p className="mt-1 text-xs text-muted">
            Change your course or semester and your home page follows along.
          </p>
        </div>

        {message ? (
          <div
            role="status"
            className={`flex items-center gap-2.5 rounded-md border px-4 py-3 text-xs font-medium ${
              message.type === 'success'
                ? 'border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]'
                : 'border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]'
            }`}
          >
            {message.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : null}
            <span>{message.text}</span>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="full_name" className="mb-1.5 block text-xs font-semibold text-charcoal">
              Full Name
            </label>
            <input
              id="full_name"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="h-10 w-full rounded-md border border-line-strong bg-canvas px-3 text-sm text-charcoal focus:border-burgundy focus:outline-none lg:h-11 lg:rounded-xl lg:px-3.5"
            />
          </div>

          <div>
            <label htmlFor="university" className="mb-1.5 block text-xs font-semibold text-charcoal">
              University
            </label>
            <select
              id="university"
              value={universityId}
              onChange={(e) => handleUniversityChange(e.target.value)}
              className="h-10 w-full rounded-md border border-line-strong bg-canvas px-3 text-sm text-charcoal focus:border-burgundy focus:outline-none lg:h-11 lg:rounded-xl lg:px-3.5"
            >
              <option value="">Select University</option>
              {universities.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.short_name} — {u.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="programme" className="mb-1.5 block text-xs font-semibold text-charcoal">
              Degree Programme (Course)
            </label>
            <select
              id="programme"
              value={programmeId}
              onChange={(e) => {
                const nextProg = e.target.value;
                setProgrammeId(nextProg);
                setSpecializationId('');
                const firstSem = semesters.find((s) => s.programme_id === nextProg);
                setSemesterId(firstSem?.id || '');
                setRegulationId((previous) =>
                  keepValidSchemeId(
                    previous,
                    applicableSchemes({
                      regulations,
                      programmes,
                      universityId,
                      programmeId: nextProg,
                    })
                  )
                );
              }}
              className="h-10 w-full rounded-md border border-line-strong bg-canvas px-3 text-sm text-charcoal focus:border-burgundy focus:outline-none lg:h-11 lg:rounded-xl lg:px-3.5"
            >
              <option value="">Select Programme</option>
              {programmes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.full_title ? `— ${p.full_title}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="specialization"
              className="mb-1.5 block text-xs font-semibold text-charcoal"
            >
              Specialization / Branch
            </label>
            <select
              id="specialization"
              value={specializationId}
              disabled={!programmeId || availableSpecializations.length === 0}
              onChange={(e) => setSpecializationId(e.target.value)}
              className="h-10 w-full rounded-md border border-line-strong bg-canvas px-3 text-sm text-charcoal focus:border-burgundy focus:outline-none lg:h-11 lg:rounded-xl lg:px-3.5 disabled:opacity-55"
            >
              <option value="">
                {availableSpecializations.length === 0
                  ? 'Not applicable / General'
                  : 'Select Specialization'}
              </option>
              {availableSpecializations.map((sp) => (
                <option key={sp.id} value={sp.id}>
                  {sp.code} — {sp.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="semester" className="mb-1.5 block text-xs font-semibold text-charcoal">
              Current Semester
            </label>
            <select
              id="semester"
              value={semesterId}
              disabled={!programmeId}
              onChange={(e) => setSemesterId(e.target.value)}
              className="h-10 w-full rounded-md border border-line-strong bg-canvas px-3 text-sm text-charcoal focus:border-burgundy focus:outline-none lg:h-11 lg:rounded-xl lg:px-3.5 disabled:opacity-55"
            >
              <option value="">Select Semester</option>
              {availableSemesters.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="regulation" className="mb-1.5 block text-xs font-semibold text-charcoal">
              Academic Regulation / Scheme
            </label>
            <select
              id="regulation"
              value={regulationId}
              onChange={(e) => setRegulationId(e.target.value)}
              className="h-10 w-full rounded-md border border-line-strong bg-canvas px-3 text-sm text-charcoal focus:border-burgundy focus:outline-none lg:h-11 lg:rounded-xl lg:px-3.5"
            >
              <option value="">Select Regulation / Scheme (Optional)</option>
              {availableRegulations.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} {r.batch_range ? `(${r.batch_range})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end border-t border-line pt-4">
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Saving changes...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Save Profile</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
