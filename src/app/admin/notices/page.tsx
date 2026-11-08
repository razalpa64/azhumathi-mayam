import { requireMainAdminUser, getWebsiteSettings } from '@/lib/auth/session';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getAdminLookupBundle } from '@/lib/admin-taxonomy';
import { NoticesManagerClient } from '@/components/admin/NoticesManagerClient';
import type { Notice } from '@/types/database';

export const metadata = {
  title: 'Notices & Announcements Management',
};

export default async function AdminNoticesPage() {
  await requireMainAdminUser();
  const adminClient = createSupabaseAdminClient();

  const [{ data: notices }, taxonomy, settings] = await Promise.all([
    adminClient
      .from('notices')
      .select(
        '*, target_programme:programmes(id, code, name), target_semester:semesters(id, semester_number, label), target_specialization:specializations(id, code, name)'
      )
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false }),
    getAdminLookupBundle(),
    getWebsiteSettings(),
  ]);

  return (
    <NoticesManagerClient
      initialNotices={(notices || []) as unknown as Notice[]}
      programmes={taxonomy.programmes}
      semesters={taxonomy.semesters}
      specializations={taxonomy.specializations}
      initialNoticesEnabled={settings.notices_enabled}
    />
  );
}
