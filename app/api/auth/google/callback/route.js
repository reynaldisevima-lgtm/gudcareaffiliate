import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { createSession } from '@/lib/auth';
import { appOrigin, verifyCallback } from '@/lib/google';

export const dynamic = 'force-dynamic';

// Google mengembalikan pengguna ke sini. Hanya email yang sudah didaftarkan admin yang bisa masuk;
// akun Google (sub) dikunci ke user pada login pertama.
export async function GET(req) {
  const params = new URL(req.url).searchParams;
  const jar = await cookies();
  let saved = null;
  try { saved = JSON.parse(jar.get('g_oauth')?.value || 'null'); } catch {}
  jar.delete({ name: 'g_oauth', path: '/api/auth/google' });
  const fail = (code) => NextResponse.redirect(new URL(`/login?error=${code}`, appOrigin(req)));

  if (params.get('error')) return fail('google_cancel');
  if (!saved || !params.get('code') || params.get('state') !== saved.state) return fail('google_state');

  let claims;
  try {
    claims = await verifyCallback(req, params.get('code'), saved);
  } catch (e) {
    console.error('Login Google gagal:', e.message);
    return fail('google_failed');
  }
  if (!claims.email || claims.email_verified !== true) return fail('google_failed');

  const user = await db.get('SELECT id, google_sub FROM users WHERE email=?', String(claims.email).toLowerCase());
  if (!user) return fail('not_registered');
  if (user.google_sub && user.google_sub !== claims.sub) return fail('google_mismatch');
  if (!user.google_sub) await db.run('UPDATE users SET google_sub=? WHERE id=?', claims.sub, user.id);

  await createSession(user.id);
  return NextResponse.redirect(new URL('/dashboard', appOrigin(req)));
}
