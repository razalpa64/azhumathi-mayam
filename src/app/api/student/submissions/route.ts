import { NextResponse, type NextRequest } from 'next/server';
import { friendlyDbError } from '@/lib/db-errors';
import { z } from 'zod';
import { requireApiAuth } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { storageProvider } from '@/lib/storage/google-drive-link-provider';

const createSchema = z.object({
  subject_id: z.string().uuid('Please pick the subject this material is for.'),
  category_id: z.string().uuid('Please pick what kind of material this is.'),
  title: z.string().trim().min(3, 'Give the material a title (at least 3 characters).').max(200),
  description: z.string().trim().max(1500).optional().nullable(),
  google_drive_share_url: z
    .string()
    .trim()
    .min(1, 'Paste the Google Drive sharing link.')
    .max(1024),
  file_type: z
    .enum(['PDF', 'DOC', 'DOCX', 'PPT', 'PPTX', 'XLS', 'XLSX', 'ZIP', 'OTHER'])
    .default('PDF'),
});

const SUBMISSION_SELECT = `
  *,
  subject:subjects(id, subject_code, name),
  category:resource_categories(id, name)
`;

/** My contributions, newest first. */
export async function GET() {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('material_submissions')
    .select(SUBMISSION_SELECT)
    .eq('student_id', auth.profile.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json(
      { error: friendlyDbError(error, 'Could not load your uploads. Please try again.', 'student') },
      { status: 400 }
    );
  }
  return NextResponse.json({ items: data || [] });
}

/** Submit a Google Drive link as a material contribution. */
export async function POST(request: NextRequest) {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;
  if (auth.profile.role !== 'student') {
    return NextResponse.json(
      { error: 'Only students can contribute materials.' },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid submission.' },
      { status: 400 }
    );
  }
  const payload = parsed.data;

  // Same Drive-link validation the admin upload uses.
  const linkCheck = storageProvider.parseAndValidateUrl(payload.google_drive_share_url);
  if (!linkCheck.valid || !linkCheck.normalizedShareUrl) {
    return NextResponse.json(
      { error: linkCheck.error || 'Invalid Google Drive sharing URL.' },
      { status: 400 }
    );
  }

  const supabase = await createSupabaseServerClient();

  // The subject must be real (and visible to the student).
  const { data: subject } = await supabase
    .from('subjects')
    .select('id')
    .eq('id', payload.subject_id)
    .maybeSingle();
  if (!subject) {
    return NextResponse.json(
      { error: 'Selected subject was not found. Please pick the subject again.' },
      { status: 400 }
    );
  }

  // Gentle flood guard: at most 5 contributions waiting at once.
  const { count: pendingCount } = await supabase
    .from('material_submissions')
    .select('id', { count: 'exact', head: true })
    .eq('student_id', auth.profile.id)
    .eq('status', 'pending');
  if ((pendingCount || 0) >= 5) {
    return NextResponse.json(
      {
        error:
          'You already have 5 uploads waiting for review. Once some are approved, you can add more.',
      },
      { status: 429 }
    );
  }

  const { data: created, error } = await supabase
    .from('material_submissions')
    .insert({
      student_id: auth.profile.id,
      subject_id: payload.subject_id,
      category_id: payload.category_id,
      title: payload.title,
      description: payload.description || null,
      google_drive_share_url: linkCheck.normalizedShareUrl,
      file_type: payload.file_type,
      status: 'pending',
    })
    .select(SUBMISSION_SELECT)
    .single();

  if (error || !created) {
    return NextResponse.json(
      {
        error: friendlyDbError(
          error,
          'That upload did not go through. Please try again.',
          'student'
        ),
      },
      { status: 400 }
    );
  }
  return NextResponse.json({ item: created }, { status: 201 });
}

/** Withdraw one of my still-pending contributions. */
export async function DELETE(request: NextRequest) {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing submission id.' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('material_submissions')
    .delete()
    .eq('id', id)
    .eq('student_id', auth.profile.id)
    .eq('status', 'pending');

  if (error) {
    return NextResponse.json(
      { error: friendlyDbError(error, 'Could not withdraw that upload.', 'student') },
      { status: 400 }
    );
  }
  return NextResponse.json({ ok: true });
}
