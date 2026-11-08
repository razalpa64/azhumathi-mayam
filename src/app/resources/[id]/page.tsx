import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, BookOpen, FileText, GraduationCap, Lock } from 'lucide-react';
import {
  getAuthenticatedProfile,
  isStaffRole,
  requireAuthenticatedUser,
} from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getSubjectGroupIds } from '@/lib/subject-siblings';
import { getActiveAdvertisementsByPlacement } from '@/lib/ads';
import { storageProvider } from '@/lib/storage/google-drive-link-provider';
import { StudentShell } from '@/components/student/StudentShell';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { ResourceViewerClient } from '@/components/student/ResourceViewerClient';
import { SITE_NAME } from '@/lib/site';
import type {
  AdPlacement,
  Advertisement,
  Resource,
  ResourceFileType,
} from '@/types/database';

const RESOURCE_JOIN = `
  *,
  programme:programmes(id, code, name),
  specialization:specializations(id, code, name),
  semester:semesters(id, semester_number, label),
  subject:subjects(id, subject_code, name),
  category:resource_categories(id, name, slug, is_question_paper),
  university:universities(id, short_name, name),
  regulation:academic_regulations(id, code, name)
`;

/**
 * Public share metadata. Shared material links land on WhatsApp from one
 * student to another, so the preview needs a real title — and it has to
 * work without a session (RLS would hide the row from an anonymous
 * client, so we read just the safe label columns with the service key).
 */
interface PreviewMaterial {
  id: string;
  title: string;
  subject: { subject_code: string; name: string } | null;
  category: { name: string } | null;
  university: { short_name: string } | null;
  programme: { name: string } | null;
  semester: { label: string } | null;
  specialization: { code: string } | null;
}

async function loadPreviewLabel(id: string): Promise<PreviewMaterial | null> {
  try {
    const admin = createSupabaseAdminClient();
    const { data } = await admin
      .from('resources')
      .select(
        `id, title, publication_status,
         subject:subjects(subject_code, name),
         category:resource_categories(name),
         university:universities(short_name),
         programme:programmes(name),
         semester:semesters(label),
         specialization:specializations(code)`
      )
      .eq('id', id)
      .maybeSingle();
    if (!data || data.publication_status !== 'published') return null;
    return {
      id: data.id as string,
      title: data.title as string,
      subject: (data.subject as unknown as PreviewMaterial['subject']) ?? null,
      category: (data.category as unknown as PreviewMaterial['category']) ?? null,
      university: (data.university as unknown as PreviewMaterial['university']) ?? null,
      programme: (data.programme as unknown as PreviewMaterial['programme']) ?? null,
      semester: (data.semester as unknown as PreviewMaterial['semester']) ?? null,
      specialization:
        (data.specialization as unknown as PreviewMaterial['specialization']) ?? null,
    };
  } catch {
    return null;
  }
}

/** Only uuid-shaped ids can ever match a row — anything else is a 404. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const label = UUID_RE.test(id) ? await loadPreviewLabel(id) : null;

  if (!label) {
    return {
      title: 'Study material',
      robots: { index: false, follow: false },
    };
  }

  const subjectLine = label.subject
    ? `${label.subject.subject_code} ${label.subject.name}`
    : null;
  const description = [subjectLine, label.semester?.label]
    .filter(Boolean)
    .join(' · ');

  return {
    title: `${label.title}${subjectLine ? ` — ${subjectLine}` : ''}`,
    description: description
      ? `${description} — notes, question papers and syllabus on ${SITE_NAME}.`
      : undefined,
    robots: { index: false, follow: true },
    openGraph: {
      type: 'article',
      title: label.title,
      description: description || undefined,
      url: `/resources/${id}`,
    },
  };
}

/**
 * The logged-out view of a shared material. Instead of a bare login wall
 * with no context, the visitor sees exactly what they were sent — which
 * paper, which subject, which semester — and one tap to open it.
 */
function PublicPreview({ resource }: { resource: PreviewMaterial }) {
  const { subject, category, university, programme, semester, specialization } = resource;
  const next = `/resources/${resource.id}`;

  const metaLine = [
    university?.short_name,
    programme?.name,
    specialization?.code,
    semester?.label,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="min-h-dvh bg-canvas text-charcoal">
      <header className="border-b border-line bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
          <BrandLogo href="/" size="sm" subtitle="Student portal" />
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
            <Link
              href={`/login?next=${encodeURIComponent(next)}`}
              className="whitespace-nowrap rounded-full px-2.5 py-2 text-sm font-semibold text-burgundy transition-colors hover:bg-burgundy-tint sm:px-4"
            >
              Sign in
            </Link>
            <Link
              href={`/register?next=${encodeURIComponent(next)}`}
              className="whitespace-nowrap rounded-full bg-burgundy px-3.5 py-2 text-sm font-semibold text-white shadow-[0_10px_20px_-10px_rgba(121,0,0,0.8)] transition-all hover:bg-burgundy-dark active:scale-95 sm:px-4"
            >
              <span className="sm:hidden">Join free</span>
              <span className="hidden sm:inline">Create free account</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="rounded-[26px] border border-line bg-white p-6 shadow-[0_26px_50px_-34px_rgba(36,7,7,0.4)] sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            {category ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-burgundy-tint px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-burgundy">
                <FileText className="h-3.5 w-3.5" />
                {category.name}
              </span>
            ) : null}
            {metaLine ? (
              <span className="rounded-full bg-neutral-soft px-3 py-1 text-[11px] font-semibold text-muted">
                {metaLine}
              </span>
            ) : null}
          </div>

          <h1 className="mt-4 text-2xl font-extrabold leading-tight tracking-tight text-charcoal sm:text-[28px]">
            {resource.title}
          </h1>

          {subject ? (
            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
              <BookOpen className="h-4 w-4 text-burgundy" />
              <span className="font-semibold text-charcoal">{subject.subject_code}</span>
              <span>{subject.name}</span>
            </p>
          ) : null}

          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-burgundy-border bg-burgundy-tint/60 px-4 py-3.5">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-burgundy" />
            <p className="text-xs leading-relaxed text-charcoal">
              <span className="font-semibold">A student shared this with you.</span> Signing in
              opens the notes, question papers and syllabus for your own course — free, no
              subscription.
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
            <Link
              href={`/login?next=${encodeURIComponent(next)}`}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-burgundy px-6 py-3 text-sm font-bold text-white transition-all hover:bg-burgundy-dark active:scale-[0.99]"
            >
              Sign in to open
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href={`/register?next=${encodeURIComponent(next)}`}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-line-strong px-6 py-3 text-sm font-semibold text-charcoal transition-colors hover:bg-neutral-soft"
            >
              New here? Create an account
            </Link>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            ['Notes & papers', 'Module-wise notes, previous papers and syllabus PDFs.'],
            ['Your semester', 'Everything arranged by course, branch and semester.'],
            ['Free for students', 'KTU, Calicut, Kerala, MGU, Kannur and CUSAT.'],
          ].map(([title, text]) => (
            <div key={title} className="rounded-2xl border border-line bg-white p-4">
              <p className="flex items-center gap-2 text-[13px] font-semibold text-charcoal">
                <GraduationCap className="h-4 w-4 text-burgundy" />
                {title}
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-muted">{text}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default async function ResourceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  // Defensive: a session lookup failure must never take the shared link
  // down — fall back to the public preview.
  const sessionProfile = await getAuthenticatedProfile().catch(() => null);

  // Logged out: serve a real preview (this is the page a forwarded
  // WhatsApp link opens) instead of bouncing straight to /login.
  if (!sessionProfile) {
    const preview = await loadPreviewLabel(id);
    if (!preview) notFound();
    return <PublicPreview resource={preview} />;
  }

  // Only build the cookie-bound client once we know there is a session to
  // read with it — the anonymous preview never touches it.
  const supabase = await createSupabaseServerClient();
  const profile = await requireAuthenticatedUser();
  const isAdmin = isStaffRole(profile.role);

  const { data: rawResource } = await supabase
    .from('resources')
    .select(RESOURCE_JOIN)
    .eq('id', id)
    .maybeSingle();

  if (!rawResource) {
    notFound();
  }

  const resource = rawResource as unknown as Resource;
  if (!isAdmin && resource.publication_status !== 'published') {
    notFound();
  }

  let urls;
  try {
    urls = storageProvider.getResourceUrls(
      resource.google_drive_file_id,
      resource.file_type as ResourceFileType
    );
  } catch {
    notFound();
  }

  const relatedSubjectIds = await getSubjectGroupIds(supabase, resource.subject_id);

  const [bookmarkRes, relatedRes, unreadRes, adConfig] = await Promise.all([
    supabase
      .from('bookmarks')
      .select('id')
      .eq('user_id', profile.id)
      .eq('resource_id', resource.id)
      .maybeSingle(),
    supabase
      .from('resources')
      .select(RESOURCE_JOIN)
      .eq('publication_status', 'published')
      .in('subject_id', relatedSubjectIds)
      .neq('id', resource.id)
      .order('download_count', { ascending: false })
      .limit(3),
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', profile.id)
      .eq('is_read', false),
    isAdmin
      ? Promise.resolve({
          adsEnabled: false,
          requireConsent: false,
          adsensePublisherId: null,
          byPlacement: {} as Partial<Record<AdPlacement, Advertisement>>,
        })
      : getActiveAdvertisementsByPlacement(),
  ]);

  const viewerContent = (
    <ResourceViewerClient
      resource={resource}
      previewUrl={urls.previewUrl}
      openUrl={urls.openUrl}
      supportsInlinePdfPreview={urls.supportsInlinePdfPreview}
      initialBookmarked={Boolean(bookmarkRes.data)}
      relatedResources={(relatedRes.data || []) as unknown as Resource[]}
      isAdminViewer={isAdmin}
      adsEnabled={adConfig.adsEnabled}
      requireAdConsent={adConfig.requireConsent}
      belowPreviewAd={adConfig.byPlacement.below_pdf_preview}
    />
  );

  if (isAdmin) {
    return (
      <div className="min-h-screen bg-canvas">
        <header className="border-b border-line bg-burgundy-deep text-canvas">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-10 lg:h-[72px] xl:max-w-[1440px]">
            <BrandLogo href="/admin" size="sm" theme="dark" subtitle="Administrator Preview" />
            <Link
              href="/admin/resources"
              className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-canvas hover:bg-white/20"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Return to Admin Console</span>
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10 lg:py-10 xl:max-w-[1440px]">{viewerContent}</main>
      </div>
    );
  }

  return (
    <StudentShell profile={profile} unreadNotifications={unreadRes.count || 0}>
      {viewerContent}
    </StudentShell>
  );
}
