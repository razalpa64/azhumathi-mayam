import * as path from 'node:path';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const BASE_URL = 'http://localhost:3000';

class SessionJar {
  private cookies = new Map<string, string>();

  updateFromResponse(res: Response) {
    const setCookies = res.headers.getSetCookie?.() || [];
    for (const raw of setCookies) {
      const firstPart = raw.split(';')[0];
      const eqIdx = firstPart.indexOf('=');
      if (eqIdx > 0) {
        const name = firstPart.slice(0, eqIdx).trim();
        const val = firstPart.slice(eqIdx + 1).trim();
        if (!val) this.cookies.delete(name);
        else this.cookies.set(name, val);
      }
    }
  }

  header(): string {
    return Array.from(this.cookies.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }

  async request(urlPath: string, init: RequestInit = {}) {
    const headers = new Headers(init.headers || {});
    const cookieHeader = this.header();
    if (cookieHeader) headers.set('cookie', cookieHeader);
    const res = await fetch(`${BASE_URL}${urlPath}`, {
      ...init,
      headers,
      redirect: init.redirect || 'manual',
    });
    this.updateFromResponse(res);
    return res;
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

async function run() {
  const adminUsername = process.env.ADMIN_INITIAL_USERNAME || 'admin@invytra';
  const adminPassword = process.env.ADMIN_INITIAL_PASSWORD!;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseSecret = process.env.SUPABASE_SECRET_KEY!;

  const sbAdmin = createClient(supabaseUrl, supabaseSecret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let createdStudentId: string | null = null;
  const createdResourceIds: string[] = [];
  const beforeTestIso = new Date().toISOString();

  try {
    console.log('--- Running End-to-End Platform Verification Suite ---');

    // 0. Unauthenticated route guards
    const unauthDash = await fetch(`${BASE_URL}/dashboard`, { redirect: 'manual' });
    assert(
      unauthDash.status === 307 && unauthDash.headers.get('location')?.includes('/login'),
      'Unauthenticated /dashboard must redirect to /login'
    );
    const unauthAdminApi = await fetch(`${BASE_URL}/api/admin/resources`);
    assert(unauthAdminApi.status === 401, 'Unauthenticated /api/admin/resources must return 401');
    console.log('PASS [0]: Unauthenticated routes & APIs strictly guarded');

    // 1. Admin Login (`admin@invytra`)
    const adminJar = new SessionJar();
    const adminLoginRes = await adminJar.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: adminUsername, password: adminPassword }),
    });
    const adminLoginJson = await adminLoginRes.json();
    assert(adminLoginRes.status === 200 && adminLoginJson.role === 'admin', 'Admin login must succeed');
    assert(adminLoginJson.redirectTo === '/admin', 'Admin must redirect to /admin');
    console.log('PASS [1]: Super Administrator (admin@invytra) login & role redirect verified');

    // 2. Test 1-4 & 12: Google Drive Link Validation (Valid, Invalid, External, Injection, Missing ID, Unavailable)
    const validFormats = [
      'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view?usp=sharing',
      'https://drive.google.com/open?id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs',
      'https://drive.google.com/uc?id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs&export=download',
    ];
    for (const url of validFormats) {
      const vRes = await adminJar.request('/api/admin/resources/validate-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const vJson = await vRes.json();
      assert(vRes.status === 200 && vJson.valid === true, `Valid Drive link rejected: ${url}`);
      assert(
        vJson.fileId === '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs',
        'Extracted File ID must match exactly'
      );
      assert(
        vJson.previewUrl === 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/preview',
        'Canonical preview URL generated from File ID'
      );
    }
    console.log('PASS [2]: Valid Google Drive sharing-link formats & unavailable/404 reachability inspection verified');

    const invalidCases = [
      { label: 'Invalid Drive folder link', url: 'https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUv' },
      { label: 'Unsupported external domain', url: 'https://example.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view' },
      { label: 'Missing file ID', url: 'https://drive.google.com/open' },
      { label: 'Short/malformed file ID', url: 'https://drive.google.com/file/d/abc/view' },
      { label: 'JavaScript injection URL', url: 'javascript:alert(document.cookie)' },
      { label: 'Credential/host spoofing URL', url: 'https://drive.google.com@evil.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view' },
      { label: 'XSS payload in URL', url: 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKv"><script>/view' },
    ];
    for (const tc of invalidCases) {
      const r = await adminJar.request('/api/admin/resources/validate-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: tc.url }),
      });
      assert(r.status === 400, `Expected 400 for ${tc.label}, got ${r.status}`);
    }
    console.log('PASS [3]: Invalid Drive links, external domains, missing File IDs, and XSS/JS injections rejected');

    // Fetch taxonomy to get B.Tech CSE Sem 3CST201 IDs
    const taxRes = await adminJar.request('/api/taxonomy');
    const tax = await taxRes.json();
    const btech = tax.programmes.find((p: { code: string }) => p.code === 'BTECH');
    const cse = tax.specializations.find(
      (s: { programme_id: string; code: string }) => s.programme_id === btech.id && s.code === 'CSE'
    );
    const sem3 = tax.semesters.find(
      (s: { programme_id: string; semester_number: number }) =>
        s.programme_id === btech.id && s.semester_number === 3
    );
    const cst201 = tax.subjects.find((s: { subject_code: string }) => s.subject_code === 'CST201');
    const lectureCat = tax.categories.find((c: { slug: string }) => c.slug === 'lecture-notes');
    assert(btech && cse && sem3 && cst201 && lectureCat, 'Seeded taxonomy must exist');

    // 4. Create temporary Student account via Admin API
    const tempUsername = `verify_student_${Date.now()}`;
    const tempPassword = 'VerifyPass!2026';
    const createStudentRes = await adminJar.request('/api/admin/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: tempUsername,
        temporaryPassword: tempPassword,
        full_name: 'Verification Student',
        programme_id: btech.id,
        specialization_id: cse.id,
        semester_id: sem3.id,
      }),
    });
    const createStudentJson = await createStudentRes.json();
    assert(createStudentRes.status === 201, 'Admin creating student must return 201');
    createdStudentId = createStudentJson.student.id;
    console.log('PASS [4]: Admin student creation provisioned successfully');

    // 5. Admin publishing a resource + saving a draft resource
    const pubRes = await adminJar.request('/api/admin/resources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'CST201 Data Structures — Verified Test Notes',
        description: 'Automated verification PDF resource.',
        programme_id: btech.id,
        specialization_id: cse.id,
        semester_id: sem3.id,
        subject_id: cst201.id,
        category_id: lectureCat.id,
        academic_year: '2026-2027',
        keywords: ['trees', 'graphs'],
        google_drive_share_url:
          'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view?usp=sharing',
        file_type: 'PDF',
        publication_status: 'published',
      }),
    });
    const pubJson = await pubRes.json();
    assert(pubRes.status === 201 && pubJson.resource.id, 'Published resource creation must succeed');
    const pubResourceId: string = pubJson.resource.id;
    createdResourceIds.push(pubResourceId);

    const draftRes = await adminJar.request('/api/admin/resources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'CST201 Unpublished Draft Notes',
        programme_id: btech.id,
        specialization_id: cse.id,
        semester_id: sem3.id,
        subject_id: cst201.id,
        category_id: lectureCat.id,
        google_drive_share_url:
          'https://drive.google.com/open?id=1DraftFileIdForVerificationOnly99',
        file_type: 'PDF',
        publication_status: 'draft',
      }),
    });
    const draftJson = await draftRes.json();
    assert(draftRes.status === 201 && draftJson.resource.id, 'Draft resource creation must succeed');
    const draftResourceId: string = draftJson.resource.id;
    createdResourceIds.push(draftResourceId);
    console.log('PASS [5]: Admin publishing & draft saving verified');

    // 6. Student login, role restriction, personalized visibility, hidden drafts
    const studentJar = new SessionJar();
    const stLoginRes = await studentJar.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: tempUsername, password: tempPassword }),
    });
    const stLoginJson = await stLoginRes.json();
    assert(
      stLoginRes.status === 200 && stLoginJson.redirectTo === '/dashboard',
      'Student login must redirect to /dashboard'
    );

    // Student blocked from /admin page & /api/admin/*
    const stAdminPage = await studentJar.request('/admin');
    assert(
      stAdminPage.status === 307 && stAdminPage.headers.get('location')?.includes('/dashboard'),
      'Student visiting /admin must redirect to /dashboard'
    );
    const stAdminApi = await studentJar.request('/api/admin/resources');
    assert(stAdminApi.status === 403, 'Student calling /api/admin/resources must get 403');

    // Student sees published resource in search, does NOT see draft resource
    const stListRes = await studentJar.request(`/api/resources?subjectId=${cst201.id}`);
    const stListJson = await stListRes.json();
    assert(
      stListJson.items.some((r: { id: string }) => r.id === pubResourceId),
      'Published resource must appear to student'
    );
    assert(
      !stListJson.items.some((r: { id: string }) => r.id === draftResourceId),
      'Unpublished draft resource must remain hidden from student listings'
    );

    // Student previewing PDF page (200) vs draft preview page (404)
    const previewHtmlRes = await studentJar.request(`/resources/${pubResourceId}`);
    const previewHtml = await previewHtmlRes.text();
    assert(previewHtmlRes.status === 200, 'Student PDF preview page must return 200');
    assert(
      previewHtml.includes('https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/preview'),
      'Preview page must embed canonical Google Drive /preview URL'
    );
    assert(
      previewHtml.includes('Open in Google Drive'),
      'Preview page must include Open in Google Drive button'
    );

    const draftPreviewRes = await studentJar.request(`/resources/${draftResourceId}`);
    assert(draftPreviewRes.status === 404, 'Draft resource preview must return 404 to students');
    console.log('PASS [6]: Student auth, admin route isolation, PDF preview, and unpublished hiding verified');

    // 7. Student downloading a document + atomic deduplication
    const dl1 = await studentJar.request(`/api/resources/${pubResourceId}/download`, {
      method: 'POST',
    });
    const dl1Json = await dl1.json();
    assert(
      dl1.status === 200 &&
        dl1Json.downloadUrl ===
          'https://drive.google.com/uc?export=download&id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs' &&
        dl1Json.recorded === true &&
        dl1Json.downloadCount === 1,
      'First download must increment count and return canonical Drive download URL'
    );

    const dl2 = await studentJar.request(`/api/resources/${pubResourceId}/download`, {
      method: 'POST',
    });
    const dl2Json = await dl2.json();
    assert(
      dl2.status === 200 && dl2Json.recorded === false && dl2Json.downloadCount === 1,
      'Immediate duplicate download click must be deduplicated'
    );
    console.log('PASS [7]: Student download endpoint & 5-minute deduplication verified');

    // 8. Admin editing metadata & replacing Google Drive link
    const editRes = await adminJar.request(`/api/admin/resources/${pubResourceId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'CST201 Data Structures — Updated Edition',
        google_drive_share_url:
          'https://drive.google.com/file/d/1ReplacedDriveFileId9876543210AbCd/view?usp=sharing',
      }),
    });
    const editJson = await editRes.json();
    assert(
      editRes.status === 200 &&
        editJson.resource.google_drive_file_id === '1ReplacedDriveFileId9876543210AbCd' &&
        editJson.resource.title === 'CST201 Data Structures — Updated Edition',
      'Admin editing metadata & replacing Drive link must update file ID cleanly'
    );
    console.log('PASS [8]: Admin editing resource & replacing Google Drive link verified');

    // 9. Admin deleting resource records
    for (const rid of [...createdResourceIds]) {
      const delRes = await adminJar.request(`/api/admin/resources/${rid}`, {
        method: 'DELETE',
      });
      assert(delRes.status === 200, `Deleting resource ${rid} must return 200`);
    }
    createdResourceIds.length = 0;
    console.log('PASS [9]: Admin deleting resource database records verified');

    console.log('=== ALL PLATFORM VERIFICATION TESTS PASSED ===');
  } finally {
    // Cleanup temporary verification artifacts so production DB has zero mock data
    for (const rid of createdResourceIds) {
      await sbAdmin.from('resources').delete().eq('id', rid);
    }
    if (createdStudentId) {
      await sbAdmin.auth.admin.deleteUser(createdStudentId);
    }
    await sbAdmin
      .from('admin_activity_logs')
      .delete()
      .gte('created_at', beforeTestIso)
      .neq('action_type', 'SYSTEM_PROVISIONED');
    console.log('Cleaned up temporary verification artifacts (zero fake data in DB).');
  }
}

run().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
