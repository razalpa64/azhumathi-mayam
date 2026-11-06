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

    console.log('3. Applying seed.sql (authentic Kerala taxonomy, zero fake data)...');
    const seedSql = fs.readFileSync(path.resolve(process.cwd(), 'supabase/seed.sql'), 'utf8');
    await pg.query(seedSql);

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
