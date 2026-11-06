import Link from 'next/link';
import { Clock } from 'lucide-react';
import { requireStudentAppUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ResourceCard } from '@/components/student/ResourceCard';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Resource } from '@/types/database';
import { formatDateTime } from '@/lib/utils';

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

export const metadata = {
  title: 'Recently Viewed Materials',
};

export default async function HistoryPage() {
  const profile = await requireStudentAppUser();
  const supabase = await createSupabaseServerClient();

  const [{ data: rows }, { data: bookmarks }] = await Promise.all([
    supabase
      .from('recently_viewed')
      .select(`id, viewed_at, view_count, resource:resources(${RESOURCE_JOIN})`)
      .eq('user_id', profile.id)
      .order('viewed_at', { ascending: false })
      .limit(24),
    supabase.from('bookmarks').select('resource_id').eq('user_id', profile.id),
  ]);

  const bookmarkSet = new Set((bookmarks || []).map((b) => b.resource_id));
  const entries = (rows || [])
    .map((r) => ({
      viewedAt: r.viewed_at as string,
      viewCount: r.view_count as number,
      resource: r.resource as unknown as Resource | null,
    }))
    .filter(
      (item): item is { viewedAt: string; viewCount: number; resource: Resource } =>
        Boolean(item.resource && item.resource.publication_status === 'published')
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-charcoal">
          Recently Viewed Materials
        </h1>
        <p className="mt-1 text-sm text-muted">
          Documents and question papers you opened most recently.
        </p>
      </div>

      {entries.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No reading history yet"
          description="Whenever you open a PDF preview or resource detail page, it will be tracked here so you can pick up right where you left off."
          action={
            <Link
              href="/dashboard/materials"
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-burgundy px-4 text-xs font-semibold text-canvas hover:bg-burgundy-dark"
            >
              Explore Library
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {entries.map((entry) => (
            <div key={entry.resource.id} className="space-y-1.5">
              <p className="text-[11px] font-mono text-muted">
                Last opened {formatDateTime(entry.viewedAt)}
              </p>
              <ResourceCard
                resource={entry.resource}
                initialBookmarked={bookmarkSet.has(entry.resource.id)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
