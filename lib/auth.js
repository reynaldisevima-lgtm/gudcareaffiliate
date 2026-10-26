import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SignJWT, jwtVerify } from 'jose';
import { db } from '@/lib/db';

function getSecret() {
  const s = process.env.SESSION_SECRET;
  if (!s && process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET wajib diisi di production');
  }
  return new TextEncoder().encode(s || 'dev-only-secret-change-me-0123456789abcdef');
}

// Set COOKIE_SECURE=false hanya jika app dijalankan lewat HTTP biasa (tanpa HTTPS).
export const cookieSecure = () =>
  process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : process.env.NODE_ENV === 'production';

export async function createSession(userId) {
  const token = await new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(getSecret());
  (await cookies()).set('session', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: cookieSecure(),
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function getUser() {
  const token = (await cookies()).get('session')?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return (
      (await db.get(`SELECT u.id,u.email,u.name,u.role,u.brand_id,b.name AS brand_name
           FROM users u LEFT JOIN brands b ON b.id=u.brand_id WHERE u.id=?`, payload.uid)) || null
    );
  } catch {
    return null;
  }
}

export async function requireUser() {
  const u = await getUser();
  if (!u) redirect('/login');
  return u;
}

export async function requireAdmin() {
  const u = await requireUser();
  if (u.role !== 'admin') redirect('/dashboard');
  return u;
}

// Brand user hanya boleh akses form milik brand-nya; admin boleh semua.
export async function getAccessibleForm(user, formId) {
  const form = await db.get('SELECT * FROM forms WHERE id=?', Number(formId));
  if (!form) return null;
  if (user.role !== 'admin' && form.brand_id !== user.brand_id) return null;
  return form;
}
