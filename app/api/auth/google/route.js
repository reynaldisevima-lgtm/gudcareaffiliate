import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { cookieSecure } from '@/lib/auth';
import { googleEnabled, authorizationRequest, appOrigin } from '@/lib/google';

export const dynamic = 'force-dynamic';

// Mulai login Google: simpan state/nonce/PKCE (dan kode undangan bila ada) di cookie singkat
// lalu arahkan ke Google.
export async function GET(req) {
  if (!googleEnabled()) return NextResponse.redirect(new URL('/login?error=google_off', appOrigin(req)));
  const { url, saved } = authorizationRequest(req);
  const invite = new URL(req.url).searchParams.get('invite');
  if (invite) {
    if (!(await db.get('SELECT 1 FROM brands WHERE invite_token=?', invite))) {
      return NextResponse.redirect(new URL('/login?error=invite_invalid', appOrigin(req)));
    }
    saved.invite = invite;
  }
  (await cookies()).set('g_oauth', JSON.stringify(saved), {
    httpOnly: true,
    sameSite: 'lax',
    secure: cookieSecure(),
    path: '/api/auth/google',
    maxAge: 600,
  });
  return NextResponse.redirect(url);
}
