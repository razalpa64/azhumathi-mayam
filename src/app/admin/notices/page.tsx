import { requireAdminUser, getWebsiteSettings } from '@/lib/auth/session';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getAdminTaxonomyBundle } from '@/lib/admin-taxonomy';
import { NoticesManagerClient } from '@/components/admin/NoticesManagerClient';
import type { Notice } from '@/types/database';

export const metadata = {
  title: 'Notices & Announcements Management',
};

export default async function AdminNoticesPage() {
  await requireAdminUser();
  const adminClient = createSupabaseAdminClient();

  const [{ data: notices }, taxonomy, settings] = await Promise.all([
    adminClient
      .from('notices')
      .select('*, target_programme:programmes(id, code, name)')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false }),
    getAdminTaxonomyBundle(),
    getWebsiteSettings(),
  ]);

  return (
    <NoticesManagerClient
      initialNotices={(notices || []) as unknown as Notice[]}
      programmes={taxonomy.programmes}
      initialNoticesEnabled={settings.notices_enabled}
    />
  );
}
