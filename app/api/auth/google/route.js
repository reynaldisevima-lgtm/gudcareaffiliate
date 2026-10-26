import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { cookieSecure } from '@/lib/auth';
import { googleEnabled, authorizationRequest, appOrigin } from '@/lib/google';

export const dynamic = 'force-dynamic';

// Mulai login Google: simpan state/nonce/PKCE di cookie singkat lalu arahkan ke Google.
export async function GET(req) {
  if (!googleEnabled()) return NextResponse.redirect(new URL('/login?error=google_off', appOrigin(req)));
  const { url, saved } = authorizationRequest(req);
  (await cookies()).set('g_oauth', JSON.stringify(saved), {
    httpOnly: true,
    sameSite: 'lax',
    secure: cookieSecure(),
    path: '/api/auth/google',
    maxAge: 600,
  });
  return NextResponse.redirect(url);
}
