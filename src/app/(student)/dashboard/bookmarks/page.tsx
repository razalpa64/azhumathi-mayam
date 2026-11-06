import Link from 'next/link';
import { Bookmark } from 'lucide-react';
import { requireStudentAppUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ResourceCard } from '@/components/student/ResourceCard';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Resource } from '@/types/database';

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
  title: 'Saved Materials',
};

export default async function BookmarksPage() {
  const profile = await requireStudentAppUser();
  const supabase = await createSupabaseServerClient();

  const { data: rows } = await supabase
    .from('bookmarks')
    .select(`id, created_at, resource:resources(${RESOURCE_JOIN})`)
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false });

  const resources = (rows || [])
    .map((r) => r.resource as unknown as Resource | null)
    .filter((r): r is Resource => Boolean(r && r.publication_status === 'published'));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-charcoal">
            Saved Study Materials
          </h1>
          <p className="mt-1 text-sm text-muted">
            Quickly revisit bookmarked syllabus notes, lab manuals, and previous question papers.
          </p>
        </div>
        <span className="text-xs font-mono text-muted">
          {resources.length} saved item{resources.length === 1 ? '' : 's'}
        </span>
      </div>

      {resources.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="No saved study materials yet"
          description="Click the bookmark icon on any resource card or preview page to keep important notes handy for exams."
          action={
            <Link
              href="/dashboard/materials"
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-burgundy px-4 text-xs font-semibold text-canvas hover:bg-burgundy-dark"
            >
              Browse Study Materials
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {resources.map((res) => (
            <ResourceCard key={res.id} resource={res} initialBookmarked={true} />
          ))}
        </div>
      )}
    </div>
  );
}
