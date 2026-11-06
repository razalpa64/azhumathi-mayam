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
  title: 'Recently opened',
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
    <div>
      <div>
        <h1 className="font-display text-[28px] font-medium leading-tight text-charcoal sm:text-[32px]">Recently opened</h1>
        <p className="mt-1.5 text-sm text-muted">Pick up right where you left off.</p>
      </div>

      {entries.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="Nothing opened yet"
          description="Files you open will show up here, newest first."
          action={
            <Link
              href="/dashboard/materials"
              className="inline-flex h-10 items-center rounded-lg bg-burgundy px-5 text-sm font-semibold text-paper hover:bg-burgundy-dark"
            >
              Browse materials
            </Link>
          }
        />
      ) : (
        <div className="mt-7 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map((entry) => (
            <div key={entry.resource.id} className="space-y-1.5">
              <p className="text-xs text-muted">
                Opened {formatDateTime(entry.viewedAt)}
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
