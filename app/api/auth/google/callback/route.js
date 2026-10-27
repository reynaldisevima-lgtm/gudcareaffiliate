import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { createSession, cookieSecure } from '@/lib/auth';
import { appOrigin, verifyCallback } from '@/lib/google';
import { audit } from '@/lib/audit';

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

  let user = await db.get('SELECT id, email, name, role, brand_id, workspace_id, google_sub FROM users WHERE email=?', email);
  let joined = null;
  if (!user && saved.invite) {
    const brand = await db.get('SELECT id, name, workspace_id FROM brands WHERE invite_token=?', saved.invite);
    if (!brand) return fail('invite_invalid');
    const name = String(claims.name || email.split('@')[0]).trim().slice(0, 80);
    user = await db.get(
      "INSERT INTO users (email,name,password_hash,role,brand_id,workspace_id,google_sub) VALUES (?,?,'','brand',?,?,?) ON CONFLICT (email) DO NOTHING RETURNING id, email, name, role, brand_id, workspace_id, google_sub",
      email, name, brand.id, brand.workspace_id, claims.sub
    ) ?? (await db.get('SELECT id, email, name, role, brand_id, workspace_id, google_sub FROM users WHERE email=?', email));
    joined = brand;
  }
  let created = null;
  if (!user && saved.signup) {
    // Project leader baru: workspace sendiri, langsung aktif, dirinya super admin workspace itu.
    const name = String(claims.name || email.split('@')[0]).trim().slice(0, 80);
    created = await db.tx(async (t) => {
      const ws = await t.get('INSERT INTO workspaces (name) VALUES (?) RETURNING id, name', saved.signup);
      const u = await t.get(
        "INSERT INTO users (email,name,password_hash,role,workspace_id,google_sub) VALUES (?,?,'','admin',?,?) ON CONFLICT (email) DO NOTHING RETURNING id, email, name, role, brand_id, workspace_id, google_sub",
        email, name, ws.id, claims.sub
      );
      if (!u) throw new Error('email sudah terdaftar');
      await t.run("INSERT INTO app_settings (workspace_id,key,value) VALUES (?,'app_name',?)", ws.id, saved.signup.slice(0, 40));
      return { ws, u };
    }).catch(() => null);
    user = created?.u ?? (await db.get('SELECT id, email, name, role, brand_id, workspace_id, google_sub FROM users WHERE email=?', email));
  }
  if (!user) {
    // Tampilkan email yang dicoba agar mudah tahu akun Google mana yang salah pilih.
    jar.set('login_email', email, { httpOnly: true, sameSite: 'lax', secure: cookieSecure(), path: '/login', maxAge: 120 });
    await audit(null, { action: 'login.failed', summary: `Login Google ditolak: ${email} belum terdaftar` });
    return fail('not_registered');
  }
  if (user.google_sub && user.google_sub !== claims.sub) {
    await audit(null, { action: 'login.failed', summary: `Login Google ditolak: ${email} terhubung ke akun Google lain` });
    return fail('google_mismatch');
  }
  if (!user.google_sub) await db.run('UPDATE users SET google_sub=? WHERE id=?', claims.sub, user.id);

  await createSession(user.id);
  await audit(user, created
    ? { action: 'workspace.create', summary: `${email} mendaftar sebagai project leader dan membuat workspace "${created.ws.name}"` }
    : joined
      ? { action: 'join.invite', summary: `${email} bergabung ke brand ${joined.name} lewat link undangan`, brandId: joined.id }
      : { action: 'login.google', summary: `${email} masuk dengan Google`, brandId: user.brand_id });
  return NextResponse.redirect(new URL('/dashboard/statistik', appOrigin(req)));
}
