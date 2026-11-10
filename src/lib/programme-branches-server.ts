import type { SupabaseClient } from '@supabase/supabase-js';

type AnyClient = SupabaseClient;

/**
 * Server-side twin of `programmeHasBranches()`.
 *
 * The UI hides the branch picker for single-course degrees (BBA, BCA, LLB, …),
 * but the API must not trust the client: a stale tab, an old bookmark or a
 * hand-made request could still send a `specialization_id` for a programme
 * that has no branches. Anything stored that way silently changes which
 * subjects and resources the student sees afterwards, so every write path
 * funnels through here.
 */
export async function programmeAllowsBranches(
  supabase: AnyClient,
  programmeId: string | null | undefined
): Promise<boolean> {
  if (!programmeId) return false;
  const { data } = await supabase
    .from('programmes')
    .select('id, has_specializations')
    .eq('id', programmeId)
    .maybeSingle();
  return Boolean(data?.has_specializations);
}

/**
 * Returns the specialization to store: the given id only when the programme
 * exists and genuinely offers branches, `null` otherwise. Never throws — a
 * lookup failure degrades to "no branch", which is the safe default.
 */
export async function sanitizeSpecializationId(
  supabase: AnyClient,
  programmeId: string | null | undefined,
  specializationId: string | null | undefined
): Promise<string | null> {
  if (!programmeId || !specializationId) return null;
  const allowed = await programmeAllowsBranches(supabase, programmeId);
  if (!allowed) return null;
  const { data: row } = await supabase
    .from('specializations')
    .select('id, programme_id')
    .eq('id', specializationId)
    .maybeSingle();
  return row && row.programme_id === programmeId ? specializationId : null;
}
