import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
export async function proxy(req: NextRequest) {
  let res = NextResponse.next({ request: req });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return res;
  const client = createServerClient(url, key, { cookies: {
    getAll: () => req.cookies.getAll(),
    setAll: (changes) => {
      changes.forEach(({ name, value }) => req.cookies.set(name, value));
      res = NextResponse.next({ request: req });
      changes.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
    }
  }});
  await client.auth.getClaims();
  return res;
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|webp)$).*)'] };
