import { createClient } from '@supabase/supabase-js';

export function createSupabaseAdminClient() {
  if (typeof window !== 'undefined') {
    throw new Error('Security violation: Supabase Admin client cannot be invoked on the client.');
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error('Server configuration error: Missing Supabase URL or secret key.');
  }

  return createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
