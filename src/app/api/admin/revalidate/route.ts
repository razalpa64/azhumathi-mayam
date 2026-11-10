import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { requireApiStaff } from '@/lib/auth/session';
import { TAXONOMY_CACHE_TAG } from '@/lib/taxonomy';

/**
 * Drop the cached copies of the taxonomy.
 *
 * Admin writes already do this (src/app/api/admin/taxonomy/[entity]/route.ts),
 * and the time-based expiry would have cleared it within five minutes anyway.
 * This exists for the one case neither covers: a change made straight in the
 * database — a SQL migration, a Supabase table edit — where nothing in the app
 * knows a write happened, so the sign-up pickers keep showing yesterday's
 * programme list with no way to refresh it.
 *
 * Staff only. It changes no data; it only forgets one cache.
 */
export async function POST() {
  const auth = await requireApiStaff();
  if (!auth.ok) return auth.response;

  revalidateTag(TAXONOMY_CACHE_TAG);

  return NextResponse.json({ ok: true, refreshed: 'taxonomy' });
}
