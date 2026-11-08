import * as fs from 'node:fs';
import * as path from 'node:path';
import * as dotenv from 'dotenv';
import { Client } from 'pg';
import { createClient } from '@supabase/supabase-js';
import { normalizeUsername, usernameToAuthEmail } from '../src/lib/auth/username';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;
  const adminUsernameRaw = process.env.ADMIN_INITIAL_USERNAME || 'admin@invytra';
  const adminPassword = process.env.ADMIN_INITIAL_PASSWORD;

  if (!dbUrl || !supabaseUrl || !supabaseSecretKey) {
    throw new Error('Missing DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, or SUPABASE_SECRET_KEY in environment.');
  }
  if (!adminPassword || adminPassword.length < 10) {
    throw new Error('ADMIN_INITIAL_PASSWORD must be set in environment and at least 10 characters long.');
  }

  console.log('1. Connecting to Supabase PostgreSQL...');
  const pg = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });
  await pg.connect();

  try {
    console.log('2. Applying 0001_initial_schema.sql...');
    const schemaSql = fs.readFileSync(
      path.resolve(process.cwd(), 'supabase/migrations/0001_initial_schema.sql'),
      'utf8'
    );
    await pg.query(schemaSql);

    console.log('2b. Applying 0002_requests_and_short_notes.sql...');
    const requestsSql = fs.readFileSync(
      path.resolve(process.cwd(), 'supabase/migrations/0002_requests_and_short_notes.sql'),
      'utf8'
    );
    await pg.query(requestsSql);

    console.log('2c. Applying 0003_short_note_hub.sql...');
    const shortNoteHubSql = fs.readFileSync(
      path.resolve(process.cwd(), 'supabase/migrations/0003_short_note_hub.sql'),
      'utf8'
    );
    await pg.query(shortNoteHubSql);

    console.log('2d. Applying 0004_group_chat.sql...');
    const groupChatSql = fs.readFileSync(
      path.resolve(process.cwd(), 'supabase/migrations/0004_group_chat.sql'),
      'utf8'
    );
    await pg.query(groupChatSql);

    console.log('2e. Applying 0005_complete_specializations.sql...');
    const specializationsSql = fs.readFileSync(
      path.resolve(process.cwd(), 'supabase/migrations/0005_complete_specializations.sql'),
      'utf8'
    );
    await pg.query(specializationsSql);

    console.log('3. Applying seed.sql (authentic Kerala taxonomy, zero fake data)...');
    const seedSql = fs.readFileSync(path.resolve(process.cwd(), 'supabase/seed.sql'), 'utf8');
    await pg.query(seedSql);

    console.log('3b. Applying 0006_subjects_ktu_btech_2019.sql (after seed - needs taxonomy rows)...');
    const subjectsSql = fs.readFileSync(
      path.resolve(process.cwd(), 'supabase/migrations/0006_subjects_ktu_btech_2019.sql'),
      'utf8'
    );
    await pg.query(subjectsSql);

    console.log('3c. Applying 0007_subjects_ktu_btech_2024.sql (KTU 2024 scheme subjects)...');
    const subjects2024Sql = fs.readFileSync(
      path.resolve(process.cwd(), 'supabase/migrations/0007_subjects_ktu_btech_2024.sql'),
      'utf8'
    );
    await pg.query(subjects2024Sql);

    console.log('3d. Applying 0008_subjects_ktu_btech_2019_me.sql (KTU 2019 Mechanical subjects)...');
    const subjectsMeSql = fs.readFileSync(
      path.resolve(process.cwd(), 'supabase/migrations/0008_subjects_ktu_btech_2019_me.sql'),
      'utf8'
    );
    await pg.query(subjectsMeSql);

    console.log('3e. Applying 0009_subjects_calicut_fyugp_bsc.sql (Calicut FYUGP B.Sc subjects)...');
    const subjectsCuSql = fs.readFileSync(
      path.resolve(process.cwd(), 'supabase/migrations/0009_subjects_calicut_fyugp_bsc.sql'),
      'utf8'
    );
    await pg.query(subjectsCuSql);

    console.log('3f. Applying 0010_subjects_calicut_fyugp_bsc_2.sql (Calicut FYUGP B.Sc subjects, tranche 2)...');
    const subjectsCu2Sql = fs.readFileSync(
      path.resolve(process.cwd(), 'supabase/migrations/0010_subjects_calicut_fyugp_bsc_2.sql'),
      'utf8'
    );
    await pg.query(subjectsCu2Sql);

    console.log('3g. Applying 0011_dedupe_subjects.sql (collapse programme-wide duplicate subjects)...');
    const dedupeSubjectsSql = fs.readFileSync(
      path.resolve(process.cwd(), 'supabase/migrations/0011_dedupe_subjects.sql'),
      'utf8'
    );
    await pg.query(dedupeSubjectsSql);

    console.log('3h. Applying 0012_sub_admins.sql (sub-administrator role & staff policies)...');
    const subAdminsSql = fs.readFileSync(
      path.resolve(process.cwd(), 'supabase/migrations/0012_sub_admins.sql'),
      'utf8'
    );
    await pg.query(subAdminsSql);

    console.log('3i. Applying 0013_resource_audience_from_course.sql (align material branch tags with courses)...');
    const resourceAudienceSql = fs.readFileSync(
      path.resolve(process.cwd(), 'supabase/migrations/0013_resource_audience_from_course.sql'),
      'utf8'
    );
    await pg.query(resourceAudienceSql);

    console.log('3j. Applying 0014_resource_taxonomy_from_subject.sql (align material taxonomy with courses)...');
    const resourceTaxonomySql = fs.readFileSync(
      path.resolve(process.cwd(), 'supabase/migrations/0014_resource_taxonomy_from_subject.sql'),
      'utf8'
    );
    await pg.query(resourceTaxonomySql);

    console.log('3k. Applying 0015_subjects_calicut_fyugp_bba.sql (Calicut FYUGP BBA subjects)...');
    const cuBbaSql = fs.readFileSync(
      path.resolve(process.cwd(), 'supabase/migrations/0015_subjects_calicut_fyugp_bba.sql'),
      'utf8'
    );
    await pg.query(cuBbaSql);

    console.log('3l. Applying 0016_subjects_calicut_fyugp_bca.sql (Calicut FYUGP BCA subjects)...');
    const cuBcaSql = fs.readFileSync(
      path.resolve(process.cwd(), 'supabase/migrations/0016_subjects_calicut_fyugp_bca.sql'),
      'utf8'
    );
    await pg.query(cuBcaSql);

    console.log('3m. Applying 0017_subjects_calicut_fyugp_bcom.sql (Calicut FYUGP B.Com subjects)...');
    const cuBcomSql = fs.readFileSync(
      path.resolve(process.cwd(), 'supabase/migrations/0017_subjects_calicut_fyugp_bcom.sql'),
      'utf8'
    );
    await pg.query(cuBcomSql);

    console.log('3n. Applying 0018_subjects_calicut_fyugp_ba_1.sql (Calicut FYUGP B.A. English/Malayalam subjects)...');
    const cuBa1Sql = fs.readFileSync(
      path.resolve(process.cwd(), 'supabase/migrations/0018_subjects_calicut_fyugp_ba_1.sql'),
      'utf8'
    );
    await pg.query(cuBa1Sql);

    console.log('3o. Applying 0019_subjects_calicut_fyugp_ba_2.sql (Calicut FYUGP B.A. Economics/History subjects)...');
    const cuBa2Sql = fs.readFileSync(
      path.resolve(process.cwd(), 'supabase/migrations/0019_subjects_calicut_fyugp_ba_2.sql'),
      'utf8'
    );
    await pg.query(cuBa2Sql);

    console.log('3p. Applying 0020_subjects_calicut_fyugp_ba_3.sql (Calicut FYUGP B.A. Political Science subjects)...');
    const cuBa3Sql = fs.readFileSync(
      path.resolve(process.cwd(), 'supabase/migrations/0020_subjects_calicut_fyugp_ba_3.sql'),
      'utf8'
    );
    await pg.query(cuBa3Sql);

    console.log('3q. Applying 0021_push_subscriptions.sql (Web Push subscriptions)...');
    const pushSubscriptionsSql = fs.readFileSync(
      path.resolve(process.cwd(), 'supabase/migrations/0021_push_subscriptions.sql'),
      'utf8'
    );
    await pg.query(pushSubscriptionsSql);

    console.log('3r. Applying 0022_study_plans.sql (Exam study plans)...');
    const studyPlansSql = fs.readFileSync(
      path.resolve(process.cwd(), 'supabase/migrations/0022_study_plans.sql'),
      'utf8'
    );
    await pg.query(studyPlansSql);

    console.log('4. Reloading PostgREST schema cache...');
    await pg.query(`NOTIFY pgrst, 'reload schema';`);
  } finally {
    await pg.end();
  }

  console.log('5. Provisioning initial Super Administrator via Supabase Auth...');
  const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const adminUsername = normalizeUsername(adminUsernameRaw);
  const adminAuthEmail = usernameToAuthEmail(adminUsername);

  const { data: existingProfile } = await supabaseAdmin
    .from('profiles')
    .select('id, username, role')
    .eq('username', adminUsername)
    .maybeSingle();

  let adminUserId = existingProfile?.id;

  if (!adminUserId) {
    // Check if auth user already exists
    const { data: usersPage, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (listErr) throw listErr;

    const existingAuthUser = usersPage.users.find((u) => u.email?.toLowerCase() === adminAuthEmail);

    if (existingAuthUser) {
      adminUserId = existingAuthUser.id;
      const { error: updatePwErr } = await supabaseAdmin.auth.admin.updateUserById(adminUserId, {
        password: adminPassword,
        email_confirm: true,
        user_metadata: { username: adminUsername, full_name: 'Super Administrator', role: 'admin' },
      });
      if (updatePwErr) throw updatePwErr;
    } else {
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: adminAuthEmail,
        password: adminPassword,
        email_confirm: true,
        user_metadata: { username: adminUsername, full_name: 'Super Administrator', role: 'admin' },
      });
      if (createErr || !created.user) {
        throw createErr || new Error('Failed to create admin user');
      }
      adminUserId = created.user.id;
    }

    const { error: profileErr } = await supabaseAdmin.from('profiles').upsert({
      id: adminUserId,
      username: adminUsername,
      auth_email: adminAuthEmail,
      full_name: 'Super Administrator',
      role: 'admin',
      is_active: true,
      must_change_password: false,
    });
    if (profileErr) throw profileErr;

    await supabaseAdmin.from('admin_activity_logs').insert({
      admin_id: adminUserId,
      action_type: 'SYSTEM_PROVISIONED',
      entity_type: 'profile',
      entity_id: adminUserId,
      summary: `Initial super administrator (${adminUsername}) provisioned securely.`,
      metadata: { username: adminUsername },
    });

    console.log(`Provisioned Super Administrator: ${adminUsername} (${adminUserId})`);
  } else {
    console.log(`Super Administrator (${adminUsername}) already exists (${adminUserId}).`);
  }

  // Verify table counts
  const [univs, progs, specs, sems, cats, subjs] = await Promise.all([
    supabaseAdmin.from('universities').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('programmes').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('specializations').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('semesters').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('resource_categories').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('subjects').select('*', { count: 'exact', head: true }),
  ]);

  console.log('6. Database verification summary:', {
    universities: univs.count,
    programmes: progs.count,
    specializations: specs.count,
    semesters: sems.count,
    resource_categories: cats.count,
    subjects: subjs.count,
  });
}

main().catch((err) => {
  console.error('Provisioning failed:', err);
  process.exit(1);
});
