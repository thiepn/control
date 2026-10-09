import { NextRequest, NextResponse } from 'next/server';
import { userClient } from '@/lib/supabase/server';
export async function GET(request: NextRequest) {
 const next = new URL('/',request.url);const code=request.nextUrl.searchParams.get('code');
 if (code){ const client=await userClient(); const { error } = await client.auth.exchangeCodeForSession(code); if(!error) return NextResponse.redirect(next); }
 return NextResponse.redirect(new URL('/?auth=failed',request.url));
}
