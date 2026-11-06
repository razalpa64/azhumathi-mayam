import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { requireAuthenticatedUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getActiveAdvertisementsByPlacement } from '@/lib/ads';
import { storageProvider } from '@/lib/storage/google-drive-link-provider';
import { StudentShell } from '@/components/student/StudentShell';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { ResourceViewerClient } from '@/components/student/ResourceViewerClient';
import type { AdPlacement, Advertisement, Resource, ResourceFileType } from '@/types/database';

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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('resources')
    .select('title')
    .eq('id', id)
    .maybeSingle();

  return {
    title: data?.title || 'Resource Preview',
    robots: { index: false, follow: false },
  };
}

export default async function ResourceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();
  const isAdmin = profile.role === 'admin';

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
      .eq('subject_id', resource.subject_id)
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
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
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
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{viewerContent}</main>
      </div>
    );
  }

  return (
    <StudentShell profile={profile} unreadNotifications={unreadRes.count || 0}>
      {viewerContent}
    </StudentShell>
  );
}
