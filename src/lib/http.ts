import { NextResponse } from 'next/server';
import { userClient } from './supabase/server';
import { adminClient } from './supabase/admin';
export const noStore = { 'Cache-Control': 'private, no-store' };
export function json(value: unknown, status = 200) { return NextResponse.json(value, { status, headers: noStore }); }
export async function requireOwner() {
  const client = await userClient();
  const { data, error } = await client.auth.getUser(); // NOT getSession(): revalidate with auth service
  if (error || !data.user || data.user.is_anonymous) return null;
  return { ownerId: data.user.id, reader: client, writer: adminClient() };
}
export function fail(error: unknown) {
  const raw = error && typeof error === 'object' ? error as { code?:string;message?:string } : {};
  if (raw.code === 'P0002') return json({ error: 'Version conflict or record missing' },409);
  if (raw.code === '23505') return json({ error: 'Conflict: duplicate value' },409);
  if (raw.code === '23514' || raw.code === '22023' || raw.code === '22P02') return json({ error: 'Invalid input' },400);
  return json({ error: 'Operation failed' },500); // No server-side secrets in response.
}

/** Require browser writes to originate from this host; never trust a browser-supplied owner_id. */
export function sameOrigin(req: Request) {
  const origin=req.headers.get('origin');
  if (!origin) return false;
  try { return new URL(origin).origin===new URL(req.url).origin && req.headers.get('sec-fetch-site')!=='cross-site'; }catch{return false;}
}
