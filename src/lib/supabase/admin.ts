import 'server-only';
import { createClient } from '@supabase/supabase-js';
export function adminClient() {
  const key = process.env.SUPABASE_SECRET_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!key || !url) throw new Error('Server configuration incomplete');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
