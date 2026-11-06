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
  title: 'Saved',
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
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[28px] font-medium leading-tight text-charcoal sm:text-[32px]">Saved</h1>
          <p className="mt-1.5 text-sm text-muted">The notes and papers you kept for later.</p>
        </div>
        <span className="text-[13px] text-muted">
          {resources.length} {resources.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      {resources.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="Nothing saved yet"
          description="Tap the bookmark on any note or paper and it’ll wait for you here."
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
          {resources.map((res) => (
            <ResourceCard key={res.id} resource={res} initialBookmarked={true} />
          ))}
        </div>
      )}
    </div>
  );
}
