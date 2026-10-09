import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
export async function userClient() {
  const store = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll() { return store.getAll(); }, setAll(changes) {
      for (const { name, value, options } of changes) {
        try { store.set(name, value, options); } catch { /* Read-only server context; proxy refreshes session. */ }
      }
    } } }
  );
}
