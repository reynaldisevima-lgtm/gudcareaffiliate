import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { createSession, cookieSecure } from '@/lib/auth';
import { appOrigin, verifyCallback } from '@/lib/google';

export const dynamic = 'force-dynamic';

// Google mengembalikan pengguna ke sini.
// - Email sudah terdaftar: langsung masuk (akun Google dikunci ke user pada login pertama).
// - Belum terdaftar tapi datang lewat link undangan brand: akun brand dibuat otomatis lalu masuk.
// - Belum terdaftar tanpa undangan: ditolak, email yang dicoba ditampilkan di halaman login.
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
  const email = String(claims.email).toLowerCase();

  let user = await db.get('SELECT id, google_sub FROM users WHERE email=?', email);
  if (!user && saved.invite) {
    const brand = await db.get('SELECT id FROM brands WHERE invite_token=?', saved.invite);
    if (!brand) return fail('invite_invalid');
    const name = String(claims.name || email.split('@')[0]).trim().slice(0, 80);
    user = await db.get(
      "INSERT INTO users (email,name,password_hash,role,brand_id,google_sub) VALUES (?,?,'','brand',?,?) ON CONFLICT (email) DO NOTHING RETURNING id, google_sub",
      email, name, brand.id, claims.sub
    ) ?? (await db.get('SELECT id, google_sub FROM users WHERE email=?', email));
  }
  if (!user) {
    // Tampilkan email yang dicoba agar mudah tahu akun Google mana yang salah pilih.
    jar.set('login_email', email, { httpOnly: true, sameSite: 'lax', secure: cookieSecure(), path: '/login', maxAge: 120 });
    return fail('not_registered');
  }
  if (user.google_sub && user.google_sub !== claims.sub) return fail('google_mismatch');
  if (!user.google_sub) await db.run('UPDATE users SET google_sub=? WHERE id=?', claims.sub, user.id);

  await createSession(user.id);
  return NextResponse.redirect(new URL('/dashboard/statistik', appOrigin(req)));
}
