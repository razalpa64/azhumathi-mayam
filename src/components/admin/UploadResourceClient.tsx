'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Eye,
  FileCheck2,
  Link2,
  Loader2,
  Send,
  Save,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type { StorageLinkValidationResult } from '@/lib/storage/provider';
import { buildSubjectOptions } from '@/lib/subject-options';
import type {
  AcademicRegulation,
  Programme,
  ResourceCategory,
  ResourceFileType,
  Semester,
  Specialization,
  Subject,
  University,
} from '@/types/database';
import { branchesForProgramme, programmeHasBranches } from '@/lib/programme-branches';

interface UploadResourceClientProps {
  universities: University[];
  programmes: Programme[];
  specializations: Specialization[];
  regulations: AcademicRegulation[];
  semesters: Semester[];
  subjects: Subject[];
  categories: ResourceCategory[];
}

const FILE_TYPES: ResourceFileType[] = [
  'PDF',
  'DOC',
  'DOCX',
  'PPT',
  'PPTX',
  'XLS',
  'XLSX',
  'ZIP',
  'OTHER',
];

export function UploadResourceClient({
  universities,
  programmes,
  specializations,
  regulations,
  semesters,
  subjects,
  categories,
}: UploadResourceClientProps) {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [universityId, setUniversityId] = useState(universities[0]?.id || '');
  const [programmeId, setProgrammeId] = useState(programmes[0]?.id || '');
  const [specializationId, setSpecializationId] = useState('');
  const [regulationId, setRegulationId] = useState('');
  const [semesterId, setSemesterId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [academicYear, setAcademicYear] = useState('2026-2027');
  const [keywordsInput, setKeywordsInput] = useState('');
  const [fileType, setFileType] = useState<ResourceFileType>('PDF');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');
  const [driveUrl, setDriveUrl] = useState('');

  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState<StorageLinkValidationResult | null>(null);
  const [showLivePreview, setShowLivePreview] = useState(true);

  const [submitting, setSubmitting] = useState<'draft' | 'published' | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [createdResourceId, setCreatedResourceId] = useState<string | null>(null);

  const selectedProgramme = useMemo(
    () => programmes.find((programme) => programme.id === programmeId) ?? null,
    [programmes, programmeId]
  );

  // A degree without branches never asks for one.
  const filteredSpecializations = useMemo(
    () => branchesForProgramme(specializations, selectedProgramme),
    [specializations, selectedProgramme]
  );

  const showBranchField = programmeHasBranches(selectedProgramme);

  const filteredSemesters = useMemo(
    () => semesters.filter((s) => s.programme_id === programmeId),
    [programmeId, semesters]
  );

  const filteredSubjects = useMemo(
    () =>
      buildSubjectOptions(subjects, {
        programmeId,
        semesterId,
        specializationId,
        regulationId,
        universityId,
        preferSpecializationId: specializationId,
        pinnedSubjectId: subjectId,
        collapseAcrossSemesters: !semesterId,
      }),
    [programmeId, semesterId, specializationId, regulationId, universityId, subjectId, subjects]
  );

  async function handleValidateLink() {
    setFormError(null);
    if (!driveUrl.trim()) {
      setValidation({
        valid: false,
        provider: 'google_drive_link',
        error: 'Please paste a Google Drive sharing link first.',
      });
      return;
    }

    setValidating(true);
    try {
      const res = await fetch('/api/admin/resources/validate-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ url: driveUrl.trim() }),
      });
      const data = (await res.json()) as StorageLinkValidationResult;
      setValidation(data);

      if (data.valid) {
        if (data.detectedTitle && !fileName) {
          setFileName(data.detectedTitle);
        }
        if (data.detectedTitle && !title) {
          setTitle(data.detectedTitle.replace(/\.[^.]+$/, ''));
        }
        if (data.inferredFileType) {
          setFileType(data.inferredFileType);
        }
      }
    } catch {
      setValidation({
        valid: false,
        provider: 'google_drive_link',
        error: 'Network error while validating link.',
      });
    } finally {
      setValidating(false);
    }
  }

  async function handleSave(status: 'draft' | 'published') {
    setFormError(null);
    setCreatedResourceId(null);

    if (!title.trim()) {
      setFormError('Resource title is required.');
      return;
    }
    if (!programmeId || !semesterId || !subjectId || !categoryId) {
      setFormError('Please select Degree Programme, Semester, Subject, and Resource Category.');
      return;
    }
    if (!driveUrl.trim()) {
      setFormError('Please paste and validate the Google Drive sharing URL.');
      return;
    }

    setSubmitting(status);
    try {
      const keywords = keywordsInput
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean);

      const res = await fetch('/api/admin/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          university_id: universityId || null,
          programme_id: programmeId,
          specialization_id: specializationId || null,
          regulation_id: regulationId || null,
          semester_id: semesterId,
          subject_id: subjectId,
          category_id: categoryId,
          academic_year: academicYear.trim() || null,
          keywords,
          google_drive_share_url: driveUrl.trim(),
          file_name: fileName.trim() || null,
          file_type: fileType,
          file_size: fileSize.trim() || null,
          publication_status: status,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(data.error || 'Failed to save resource.');
        return;
      }

      setCreatedResourceId(data.resource?.id || null);
      router.refresh();
    } finally {
      setSubmitting(null);
    }
  }

  function handleResetForm() {
    setTitle('');
    setDescription('');
    setDriveUrl('');
    setFileName('');
    setFileSize('');
    setKeywordsInput('');
    setValidation(null);
    setCreatedResourceId(null);
    setFormError(null);
  }

  return (
    <div className="space-y-8">
      {/* Workflow Guidance Banner */}
      <div className="rounded-xl border border-line bg-neutral-soft/75 p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-burgundy">
          Google Drive Sharing-Link Workflow
        </h2>
        <ol className="mt-2.5 grid gap-2 text-xs text-muted sm:grid-cols-4">
          <li className="rounded-md border border-line bg-canvas p-3">
            <span className="font-mono font-semibold text-charcoal">1. Upload to Drive</span>
            <p className="mt-0.5">Upload your PDF or study file to your Google Drive folder.</p>
          </li>
          <li className="rounded-md border border-line bg-canvas p-3">
            <span className="font-mono font-semibold text-charcoal">2. Set Viewer Access</span>
            <p className="mt-0.5">
              Set General Access to <strong>&ldquo;Anyone with the link – Viewer&rdquo;</strong>.
            </p>
          </li>
          <li className="rounded-md border border-line bg-canvas p-3">
            <span className="font-mono font-semibold text-charcoal">3. Validate Link</span>
            <p className="mt-0.5">
              Paste the copied link below and click <strong>Validate Link</strong>.
            </p>
          </li>
          <li className="rounded-md border border-line bg-canvas p-3">
            <span className="font-mono font-semibold text-charcoal">4. Preview & Publish</span>
            <p className="mt-0.5">
              Confirm the inline PDF preview and publish to the student library.
            </p>
          </li>
        </ol>
      </div>

      {createdResourceId ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#166534]" />
            <div>
              <h3 className="text-sm font-semibold text-[#166534]">
                Resource saved to database!
              </h3>
              <p className="mt-0.5 text-xs text-[#166534]/85">
                Preview and download URLs have been automatically generated from the validated Google Drive File ID.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/resources/${createdResourceId}`}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-burgundy px-3.5 text-xs font-semibold text-canvas hover:bg-burgundy-dark"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Open Preview Page</span>
            </Link>
            <Button variant="secondary" size="sm" onClick={handleResetForm}>
              Add Another Resource
            </Button>
          </div>
        </div>
      ) : null}

      {formError ? (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-xs font-medium text-[#991B1B]"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{formError}</span>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Form Column */}
        <div className="lg:col-span-7 space-y-6">
          {/* Step 1: Prominent Google Drive Sharing Link Card */}
          <section className="rounded-xl border-2 border-burgundy-border bg-burgundy-tint/35 p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-burgundy" />
                <h2 className="text-sm font-semibold text-charcoal">
                  Google Drive Sharing URL <span className="text-burgundy">*</span>
                </h2>
              </div>
              <Badge variant="burgundy">Primary Storage Reference</Badge>
            </div>

            <p className="text-xs text-muted leading-relaxed">
              Supported formats:{' '}
              <code className="font-mono text-[11px] text-charcoal">
                https://drive.google.com/file/d/FILE_ID/view?usp=sharing
              </code>
              ,{' '}
              <code className="font-mono text-[11px] text-charcoal">
                https://drive.google.com/open?id=FILE_ID
              </code>
              , or{' '}
              <code className="font-mono text-[11px] text-charcoal">
                https://drive.google.com/uc?id=FILE_ID
              </code>
              .
            </p>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="url"
                value={driveUrl}
                onChange={(e) => {
                  setDriveUrl(e.target.value);
                  if (validation) setValidation(null);
                }}
                placeholder="https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/view?usp=sharing"
                className="h-11 flex-1 rounded-md border border-line-strong bg-canvas px-3.5 font-mono text-xs text-charcoal placeholder:text-muted/70 focus:border-burgundy focus:outline-none focus:ring-2 focus:ring-burgundy/15"
              />
              <Button
                type="button"
                onClick={handleValidateLink}
                disabled={validating}
                className="shrink-0"
              >
                {validating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Validating...</span>
                  </>
                ) : (
                  <>
                    <FileCheck2 className="h-4 w-4" />
                    <span>Validate Link</span>
                  </>
                )}
              </Button>
            </div>

            {/* Validation Status Panel */}
            {validation ? (
              <div
                className={`rounded-lg border p-4 text-xs space-y-2 ${
                  !validation.valid
                    ? 'border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]'
                    : validation.reachability === 'restricted' ||
                      validation.reachability === 'not_found'
                    ? 'border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]'
                    : 'border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]'
                }`}
              >
                {!validation.valid ? (
                  <div className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      <p className="font-semibold">Link Validation Failed</p>
                      <p className="mt-0.5">{validation.error}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold">
                        Extracted File ID:{' '}
                        <code className="rounded bg-black/5 px-1.5 py-0.5 font-mono">
                          {validation.fileId}
                        </code>
                      </span>
                      <Badge
                        variant={
                          validation.reachability === 'public'
                            ? 'success'
                            : validation.reachability === 'unverified'
                            ? 'neutral'
                            : 'warning'
                        }
                      >
                        {validation.reachability === 'public'
                          ? 'Public Viewer Verified'
                          : validation.reachability === 'restricted'
                          ? 'Restricted Access Detected'
                          : validation.reachability === 'not_found'
                          ? '404 Not Found'
                          : 'Syntax Validated'}
                      </Badge>
                    </div>
                    <p>{validation.statusMessage}</p>
                    {validation.openInDriveUrl ? (
                      <a
                        href={validation.openInDriveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-semibold underline"
                      >
                        <span>Test link in Google Drive</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : null}
                  </div>
                )}
              </div>
            ) : null}
          </section>

          {/* Step 2: Resource Academic Categorization & Metadata */}
          <section className="rounded-xl border border-line bg-canvas p-6 space-y-5">
            <h2 className="text-sm font-semibold text-charcoal">
              Academic Categorization & Resource Details
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold text-charcoal">
                  Resource Title <span className="text-burgundy">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., CST201 Data Structures — Module 1 & 2 Complete Lecture Notes"
                  className="h-10 w-full rounded-md border border-line-strong bg-canvas px-3 text-sm text-charcoal focus:border-burgundy focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold text-charcoal">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Summarize syllabus modules covered, exam year, or faculty author notes..."
                  className="w-full rounded-md border border-line-strong bg-canvas p-3 text-sm text-charcoal focus:border-burgundy focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-charcoal">
                  University
                </label>
                <select
                  value={universityId}
                  onChange={(e) => setUniversityId(e.target.value)}
                  className="h-10 w-full rounded-md border border-line-strong bg-canvas px-3 text-xs text-charcoal focus:border-burgundy focus:outline-none"
                >
                  <option value="">All / General University</option>
                  {universities.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.short_name} — {u.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-charcoal">
                  Degree Programme <span className="text-burgundy">*</span>
                </label>
                <select
                  value={programmeId}
                  onChange={(e) => {
                    setProgrammeId(e.target.value);
                    setSpecializationId('');
                    setSemesterId('');
                    setSubjectId('');
                  }}
                  className="h-10 w-full rounded-md border border-line-strong bg-canvas px-3 text-xs text-charcoal focus:border-burgundy focus:outline-none"
                >
                  <option value="">Select Programme</option>
                  {programmes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.full_title ? `— ${p.full_title}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {showBranchField ? (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-charcoal">
                    Specialization / Branch
                  </label>
                  <select
                    value={specializationId}
                    disabled={filteredSpecializations.length === 0}
                    onChange={(e) => {
                      setSpecializationId(e.target.value);
                      setSubjectId('');
                    }}
                    className="h-10 w-full rounded-md border border-line-strong bg-canvas px-3 text-xs text-charcoal focus:border-burgundy focus:outline-none disabled:opacity-55"
                  >
                    <option value="">Common / All Branches</option>
                    {filteredSpecializations.map((sp) => (
                      <option key={sp.id} value={sp.id}>
                        {sp.code} — {sp.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-charcoal">
                  Academic Regulation / Scheme
                </label>
                <select
                  value={regulationId}
                  onChange={(e) => setRegulationId(e.target.value)}
                  className="h-10 w-full rounded-md border border-line-strong bg-canvas px-3 text-xs text-charcoal focus:border-burgundy focus:outline-none"
                >
                  <option value="">All Regulations</option>
                  {regulations.map((reg) => (
                    <option key={reg.id} value={reg.id}>
                      {reg.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-charcoal">
                  Semester <span className="text-burgundy">*</span>
                </label>
                <select
                  value={semesterId}
                  onChange={(e) => {
                    setSemesterId(e.target.value);
                    setSubjectId('');
                  }}
                  className="h-10 w-full rounded-md border border-line-strong bg-canvas px-3 text-xs text-charcoal focus:border-burgundy focus:outline-none"
                >
                  <option value="">Select Semester</option>
                  {filteredSemesters.map((sem) => (
                    <option key={sem.id} value={sem.id}>
                      {sem.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 flex items-center justify-between text-xs font-semibold text-charcoal">
                  <span>
                    Subject <span className="text-burgundy">*</span>
                  </span>
                  <Link href="/admin/subjects" className="text-[11px] text-burgundy hover:underline">
                    + New Subject
                  </Link>
                </label>
                <select
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  className="h-10 w-full rounded-md border border-line-strong bg-canvas px-3 text-xs text-charcoal focus:border-burgundy focus:outline-none"
                >
                  <option value="">
                    {filteredSubjects.length === 0
                      ? 'Select semester first (or create subject)'
                      : 'Select Subject'}
                  </option>
                  {filteredSubjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.subject_code} — {sub.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-charcoal">
                  Resource Category <span className="text-burgundy">*</span>
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="h-10 w-full rounded-md border border-line-strong bg-canvas px-3 text-xs text-charcoal focus:border-burgundy focus:outline-none"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                      {cat.is_short_note
                        ? ' — Short Notes hub'
                        : cat.is_question_paper
                          ? ' — Question Papers hub'
                          : ''}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
                  Pick <span className="font-semibold text-charcoal">Short Notes</span> or{' '}
                  <span className="font-semibold text-charcoal">Cheat Sheets</span> and the file
                  lands in the students’ Short Notes &amp; Exam Special section automatically.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-charcoal">
                  Academic Year
                </label>
                <input
                  type="text"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  placeholder="e.g., 2026-2027 or May 2025 Exam"
                  className="h-10 w-full rounded-md border border-line-strong bg-canvas px-3 text-xs text-charcoal focus:border-burgundy focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-charcoal">
                  Document Format
                </label>
                <select
                  value={fileType}
                  onChange={(e) => setFileType(e.target.value as ResourceFileType)}
                  className="h-10 w-full rounded-md border border-line-strong bg-canvas px-3 text-xs text-charcoal focus:border-burgundy focus:outline-none"
                >
                  {FILE_TYPES.map((ft) => (
                    <option key={ft} value={ft}>
                      {ft}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-charcoal">
                  File Size (Optional)
                </label>
                <input
                  type="text"
                  value={fileSize}
                  onChange={(e) => setFileSize(e.target.value)}
                  placeholder="e.g., 2.4 MB"
                  className="h-10 w-full rounded-md border border-line-strong bg-canvas px-3 text-xs text-charcoal focus:border-burgundy focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold text-charcoal">
                  Search Keywords (Comma-separated)
                </label>
                <input
                  type="text"
                  value={keywordsInput}
                  onChange={(e) => setKeywordsInput(e.target.value)}
                  placeholder="e.g., trees,avl,graphs,module 3,ktu solved"
                  className="h-10 w-full rounded-md border border-line-strong bg-canvas px-3 text-xs text-charcoal focus:border-burgundy focus:outline-none"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line pt-5">
              <Button
                type="button"
                variant="secondary"
                disabled={submitting !== null}
                onClick={() => handleSave('draft')}
              >
                {submitting === 'draft' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span>Save as Draft</span>
              </Button>

              <Button
                type="button"
                disabled={submitting !== null}
                onClick={() => handleSave('published')}
              >
                {submitting === 'published' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                <span>Publish Resource</span>
              </Button>
            </div>
          </section>
        </div>

        {/* Live Pre-Publish Preview Column */}
        <aside className="lg:col-span-5 space-y-4">
          <div className="sticky top-6 rounded-xl border border-line bg-canvas p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-charcoal">Pre-Publish Preview</h2>
              {validation?.valid ? (
                <button
                  type="button"
                  onClick={() => setShowLivePreview((v) => !v)}
                  className="text-xs font-medium text-burgundy hover:underline cursor-pointer"
                >
                  {showLivePreview ? 'Hide Frame' : 'Show Frame'}
                </button>
              ) : null}
            </div>

            {!validation || !validation.valid || !validation.previewUrl ? (
              <div className="flex h-96 flex-col items-center justify-center rounded-lg border border-dashed border-line-strong bg-neutral-soft/60 p-6 text-center">
                <Eye className="h-7 w-7 text-muted" />
                <p className="mt-3 text-xs font-semibold text-charcoal">
                  Validate a Google Drive link to preview
                </p>
                <p className="mt-1 text-xs text-muted leading-relaxed">
                  Paste your Google Drive sharing URL and click <strong>Validate Link</strong> to
                  inspect the embedded preview before publishing.
                </p>
              </div>
            ) : showLivePreview ? (
              <div className="space-y-3">
                <div className="h-[460px] overflow-hidden rounded-lg border border-line-strong bg-[#1C1917]">
                  <iframe
                    src={validation.previewUrl}
                    title="Pre-publish Google Drive preview"
                    sandbox="allow-scripts allow-same-origin allow-popups"
                    className="h-full w-full border-0"
                  />
                </div>
                <p className="text-[11px] text-muted leading-relaxed">
                  Embedded URL:{' '}
                  <code className="font-mono text-charcoal break-all">
                    {validation.previewUrl}
                  </code>
                </p>
              </div>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
